import os
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch


# The production requirements install this package through pydantic's EmailStr
# dependency.  Keeping the local test dependency path optional lets this suite be
# run from a checkout before the backend requirements have been installed.
TEST_DEPS = Path(__file__).with_name(".test-deps")
if TEST_DEPS.exists():
    sys.path.insert(0, str(TEST_DEPS))

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient
from sqlalchemy import inspect


class BackendApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp_dir = tempfile.TemporaryDirectory(ignore_cleanup_errors=True)
        cls.database_path = Path(cls.temp_dir.name) / "enginx.db"

        # Simulate the pre-feature SQLite users table.  The application must add
        # the new nullable profile fields without dropping this existing data.
        with sqlite3.connect(cls.database_path) as connection:
            connection.execute(
                """
                CREATE TABLE users (
                    id VARCHAR(36) PRIMARY KEY,
                    email VARCHAR(255) NOT NULL UNIQUE,
                    name VARCHAR(255) NOT NULL,
                    hashed_password VARCHAR(255),
                    primary_role VARCHAR(50),
                    avatar_url VARCHAR(500),
                    xp INTEGER,
                    streak_days INTEGER,
                    created_at DATETIME
                )
                """
            )
            connection.execute(
                """
                INSERT INTO users
                    (id, email, name, primary_role, avatar_url, xp, streak_days, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    "legacy-user",
                    "legacy@example.com",
                    "Legacy User",
                    "CSE",
                    None,
                    12,
                    1,
                    "2026-01-01 00:00:00",
                ),
            )

        cls.previous_database_url = os.environ.get("DATABASE_URL")
        cls.previous_evaluation_url = os.environ.get("EVALUATION_SERVICE_URL")
        os.environ["DATABASE_URL"] = f"sqlite:///{cls.database_path.as_posix()}"
        os.environ["EVALUATION_SERVICE_URL"] = "http://evaluator.invalid/api/evaluate"

        import main
        from models import LessonCompletion, User, UserProgress

        cls.main = main
        cls.LessonCompletion = LessonCompletion
        cls.User = User
        cls.UserProgress = UserProgress
        cls.client = TestClient(main.app)

        primary_signup = cls.client.post(
            "/api/auth/signup",
            json={
                "email": "primary@example.com",
                "name": "Primary User",
                "password": "primary-password",
            },
        )
        assert primary_signup.status_code == 200, primary_signup.text
        primary_login = cls.client.post(
            "/api/auth/login",
            json={"email": "primary@example.com", "password": "primary-password"},
        )
        assert primary_login.status_code == 200, primary_login.text
        cls.primary_user = primary_login.json()["user"]
        cls.primary_token = primary_login.json()["access_token"]

        secondary_signup = cls.client.post(
            "/api/auth/signup",
            json={
                "email": "secondary@example.com",
                "name": "Secondary User",
                "password": "secondary-password",
            },
        )
        assert secondary_signup.status_code == 200, secondary_signup.text
        secondary_login = cls.client.post(
            "/api/auth/login",
            json={"email": "secondary@example.com", "password": "secondary-password"},
        )
        assert secondary_login.status_code == 200, secondary_login.text
        cls.secondary_user = secondary_login.json()["user"]
        cls.secondary_token = secondary_login.json()["access_token"]

    @classmethod
    def tearDownClass(cls):
        cls.client.close()
        cls.main.engine.dispose()
        cls.temp_dir.cleanup()
        if cls.previous_database_url is None:
            os.environ.pop("DATABASE_URL", None)
        else:
            os.environ["DATABASE_URL"] = cls.previous_database_url
        if cls.previous_evaluation_url is None:
            os.environ.pop("EVALUATION_SERVICE_URL", None)
        else:
            os.environ["EVALUATION_SERVICE_URL"] = cls.previous_evaluation_url

    @classmethod
    def headers(cls, token=None):
        return {"Authorization": f"Bearer {token or cls.primary_token}"}

    def test_authentication_contract_and_legacy_password_failure(self):
        missing_auth = self.client.get("/api/auth/me")
        self.assertEqual(missing_auth.status_code, 401)

        signup = self.client.post(
            "/api/auth/signup",
            json={
                "email": "auth-contract@example.com",
                "name": "Auth Contract",
                "password": "correct-horse-battery-staple",
            },
        )
        self.assertEqual(signup.status_code, 200)
        self.assertNotIn("hashed_password", signup.json())

        session = self.main.SessionLocal()
        try:
            created = session.query(self.User).filter_by(email="auth-contract@example.com").one()
            self.assertTrue(created.hashed_password)
            self.assertNotEqual(created.hashed_password, "correct-horse-battery-staple")
        finally:
            session.close()

        duplicate = self.client.post(
            "/api/auth/signup",
            json={
                "email": "auth-contract@example.com",
                "name": "Duplicate",
                "password": "different-password",
            },
        )
        self.assertEqual(duplicate.status_code, 409)

        missing_password = self.client.post(
            "/api/auth/signup",
            json={"email": "missing-password@example.com", "name": "Missing Password"},
        )
        self.assertEqual(missing_password.status_code, 422)

        bad_password = self.client.post(
            "/api/auth/login",
            json={"email": "auth-contract@example.com", "password": "wrong-password"},
        )
        self.assertEqual(bad_password.status_code, 401)

        legacy_login = self.client.post(
            "/api/auth/login",
            json={"email": "legacy@example.com", "password": "anything-at-all"},
        )
        self.assertEqual(legacy_login.status_code, 401)

        login = self.client.post(
            "/api/auth/login",
            json={
                "email": "auth-contract@example.com",
                "password": "correct-horse-battery-staple",
            },
        )
        self.assertEqual(login.status_code, 200)
        payload = login.json()
        self.assertTrue(payload["access_token"])
        self.assertEqual(payload["token_type"], "bearer")
        self.assertEqual(payload["user"]["email"], "auth-contract@example.com")

        me = self.client.get("/api/auth/me", headers=self.headers(payload["access_token"]))
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.json()["id"], payload["user"]["id"])

    def test_all_user_scoped_routes_require_bearer_token(self):
        unauthenticated_requests = [
            ("get", "/api/user/profile", None),
            ("get", "/api/user/progress", None),
            ("get", "/api/user/stats", None),
            ("get", "/api/user/skill-tree", None),
            ("get", "/api/badges", None),
            ("get", "/api/leaderboard", None),
            ("get", "/api/submissions/history", None),
            ("get", "/api/user/lessons/completed", None),
            ("post", "/api/user/lessons/unauthenticated/complete", None),
            (
                "post",
                "/api/submissions",
                {
                    "challenge_id": "cse-01-two-sum",
                    "code": "pass",
                    "language": "python",
                },
            ),
            (
                "post",
                "/api/evaluation/matlab/script",
                {"code": "disp(1);"},
            ),
        ]
        for method, path, body in unauthenticated_requests:
            with self.subTest(method=method, path=path):
                response = getattr(self.client, method)(path, json=body) if body else getattr(self.client, method)(path)
                self.assertEqual(response.status_code, 401)

    def test_logic_gate_curriculum_challenges_are_seeded(self):
        response = self.client.get("/api/challenges", params={"discipline": "ece-verilog"})
        self.assertEqual(response.status_code, 200)
        challenge_ids = {challenge["id"] for challenge in response.json()}
        self.assertTrue({"ece-04-half-adder", "ece-05-not-gate", "ece-06-and-gate", "ece-07-or-gate"}.issubset(challenge_ids))

    def test_matlab_signal_curriculum_challenges_are_seeded(self):
        response = self.client.get("/api/challenges", params={"discipline": "ece-matlab"})
        self.assertEqual(response.status_code, 200)
        challenge_ids = {challenge["id"] for challenge in response.json()}
        self.assertTrue({"ece-matlab-01-sampling", "ece-matlab-02-convolution", "ece-matlab-03-fft-spectrum", "ece-matlab-04-bpsk-symbols"}.issubset(challenge_ids))

    def test_profile_and_progress_ignore_another_users_identity_hints(self):
        first_goal = "Primary private goal"
        second_goal = "Secondary private goal"

        first_update = self.client.patch(
            "/api/user/profile",
            json={"goal": first_goal},
            headers=self.headers(self.primary_token),
        )
        second_update = self.client.patch(
            "/api/user/profile",
            json={"goal": second_goal},
            headers=self.headers(self.secondary_token),
        )
        self.assertEqual(first_update.status_code, 200)
        self.assertEqual(second_update.status_code, 200)

        first_via_second_hint = self.client.get(
            "/api/user/profile?email=secondary@example.com",
            headers=self.headers(self.primary_token),
        )
        second_via_first_hint = self.client.get(
            "/api/user/profile?email=primary@example.com",
            headers=self.headers(self.secondary_token),
        )
        self.assertEqual(first_via_second_hint.status_code, 200)
        self.assertEqual(second_via_first_hint.status_code, 200)
        self.assertEqual(first_via_second_hint.json()["id"], self.primary_user["id"])
        self.assertEqual(second_via_first_hint.json()["id"], self.secondary_user["id"])
        self.assertEqual(first_via_second_hint.json()["goal"], first_goal)
        self.assertEqual(second_via_first_hint.json()["goal"], second_goal)

        session = self.main.SessionLocal()
        try:
            session.add(
                self.UserProgress(
                    user_id=self.primary_user["id"],
                    challenge_id="cse-01-two-sum",
                    completed=True,
                    attempts_count=2,
                    xp_awarded=50,
                )
            )
            session.add(
                self.UserProgress(
                    user_id=self.secondary_user["id"],
                    challenge_id="ece-01-ripple-carry-adder",
                    completed=True,
                    attempts_count=1,
                    xp_awarded=80,
                )
            )
            session.commit()
        finally:
            session.close()

        first_progress = self.client.get(
            "/api/user/progress?email=secondary@example.com",
            headers=self.headers(self.primary_token),
        )
        second_progress = self.client.get(
            "/api/user/progress?email=primary@example.com",
            headers=self.headers(self.secondary_token),
        )
        self.assertEqual(first_progress.status_code, 200)
        self.assertEqual(second_progress.status_code, 200)
        self.assertEqual(first_progress.json()["completed_challenges"], ["cse-01-two-sum"])
        self.assertEqual(second_progress.json()["completed_challenges"], ["ece-01-ripple-carry-adder"])

        onboarding = self.client.post(
            "/api/auth/onboarding",
            json={
                "role": "CYBER",
                "email": "secondary@example.com",
                "goal": "Primary onboarding goal",
            },
            headers=self.headers(self.primary_token),
        )
        self.assertEqual(onboarding.status_code, 200)
        self.assertEqual(onboarding.json()["user"]["id"], self.primary_user["id"])
        secondary_after_attack = self.client.get(
            "/api/user/profile",
            headers=self.headers(self.secondary_token),
        )
        self.assertEqual(secondary_after_attack.json()["primary_role"], "CSE")

    def test_profile_fields_are_migrated_and_update_current_demo_user(self):
        columns = {column["name"] for column in inspect(self.main.engine).get_columns("users")}
        self.assertTrue(
            {
                "branch",
                "specialization",
                "degree",
                "year",
                "goal",
                "weekly_hours",
            }.issubset(columns)
        )

        session = self.main.SessionLocal()
        try:
            legacy = session.query(self.User).filter_by(id="legacy-user").one()
            self.assertEqual(legacy.name, "Legacy User")
            self.assertEqual(legacy.xp, 12)
        finally:
            session.close()

        initial = self.client.get("/api/user/profile", headers=self.headers())
        self.assertEqual(initial.status_code, 200)
        demo_id = initial.json()["id"]

        updated = self.client.patch(
            "/api/user/profile",
            json={
                "name": "Alex Rivera",
                "branch": "Electrical and Computer Engineering",
                "specialization": "Embedded Systems",
                "degree": "B.Tech",
                "year": 3,
                "goal": "Build reliable firmware",
                "weekly_hours": 8,
            },
            headers=self.headers(),
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json()["id"], demo_id)
        self.assertEqual(updated.json()["branch"], "Electrical and Computer Engineering")
        self.assertEqual(updated.json()["weekly_hours"], 8)

        auth_alias = self.client.put(
            "/api/auth/me",
            json={"goal": "Ship a tested firmware project"},
            headers=self.headers(),
        )
        self.assertEqual(auth_alias.status_code, 200)
        self.assertEqual(auth_alias.json()["goal"], "Ship a tested firmware project")

        rejected = self.client.patch(
            "/api/user/profile",
            json={"user_id": "arbitrary-client-id", "goal": "ignored"},
            headers=self.headers(),
        )
        self.assertEqual(rejected.status_code, 422)

    def test_onboarding_accepts_new_profile_fields(self):
        response = self.client.post(
            "/api/auth/onboarding",
            json={
                "role": "AI",
                "branch": "Computer Science",
                "specialization": "Machine Learning",
                "degree": "B.Sc",
                "year": 2,
                "goal": "Learn model evaluation",
                "weekly_hours": 6,
            },
            headers=self.headers(),
        )
        self.assertEqual(response.status_code, 200)

        profile = self.client.get("/api/user/profile", headers=self.headers())
        self.assertEqual(profile.json()["primary_role"], "AI")
        self.assertEqual(profile.json()["specialization"], "Machine Learning")
        self.assertEqual(profile.json()["year"], 2)

    def test_ece_preferences_persist_on_authenticated_profile(self):
        preferences = {
            "current_year": 3,
            "current_semester": 6,
            "electronics_level": "working",
            "c_programming_level": "confident",
            "mathematics_level": "working",
            "digital_electronics_level": "working",
            "simulation_experience": "new",
            "weekly_hours": 8,
            "preferred_learning_mode": "mixed",
            "career_interests": ["VLSI RTL design", "Design verification"],
            "target_roles": ["RTL Design Engineer"],
            "available_hardware": ["No hardware yet"],
        }
        updated = self.client.patch(
            "/api/user/profile",
            json={"ece_preferences": preferences},
            headers=self.headers(),
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json()["ece_preferences"], preferences)

        restored = self.client.get("/api/user/profile", headers=self.headers())
        self.assertEqual(restored.status_code, 200)
        self.assertEqual(restored.json()["ece_preferences"]["target_roles"], ["RTL Design Engineer"])

        invalid = self.client.patch(
            "/api/user/profile",
            json={"ece_preferences": {"electronics_level": "expert"}},
            headers=self.headers(),
        )
        self.assertEqual(invalid.status_code, 422)

    def test_ece_content_lesson_completion_is_persisted_for_current_user(self):
        lesson_id = "lesson-content-verilog-digital-logic"
        completed = self.client.post(
            f"/api/user/lessons/{lesson_id}/complete",
            headers=self.headers(self.secondary_token),
        )
        self.assertEqual(completed.status_code, 200)
        self.assertEqual(completed.json()["lesson_id"], lesson_id)

        restored = self.client.get(
            "/api/user/lessons/completed",
            headers=self.headers(self.secondary_token),
        )
        self.assertEqual(restored.status_code, 200)
        self.assertIn(lesson_id, restored.json()["lesson_ids"])

        cleanup_session = self.main.SessionLocal()
        try:
            cleanup_session.query(self.LessonCompletion).filter_by(
                user_id=self.secondary_user["id"],
                lesson_id=lesson_id,
            ).delete()
            cleanup_session.commit()
        finally:
            cleanup_session.close()

    def test_lesson_completion_is_current_user_scoped_and_idempotent(self):
        first = self.client.post(
            "/api/user/lessons/lesson-intro/complete",
            headers=self.headers(),
        )
        second = self.client.post(
            "/api/user/lessons/lesson-intro/complete",
            headers=self.headers(),
        )

        self.assertEqual(first.status_code, 200)
        self.assertFalse(first.json()["already_completed"])
        self.assertEqual(second.status_code, 200)
        self.assertTrue(second.json()["already_completed"])

        restored = self.client.get(
            "/api/user/lessons/completed",
            headers=self.headers(),
        )
        self.assertEqual(restored.status_code, 200)
        self.assertEqual(restored.json()["lesson_ids"], ["lesson-intro"])

        session = self.main.SessionLocal()
        try:
            self.assertEqual(session.query(self.LessonCompletion).count(), 1)
        finally:
            session.close()

    def test_evaluator_outage_is_retryable_without_xp_or_progress(self):
        with patch(
            "routers.submissions.httpx.AsyncClient.post",
            new=AsyncMock(side_effect=RuntimeError("evaluator offline")),
        ):
            response = self.client.post(
                "/api/submissions",
                json={
                    "challenge_id": "cse-01-two-sum",
                    "code": "def two_sum(nums, target): return [0, 1]",
                    "language": "python",
                },
                headers=self.headers(),
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["verdict"], "UNAVAILABLE")
        self.assertEqual(payload["status"], "unavailable")
        self.assertTrue(payload["retryable"])
        self.assertEqual(payload["xp_awarded"], 0)

        session = self.main.SessionLocal()
        try:
            user = session.query(self.User).filter_by(email="primary@example.com").one()
            self.assertEqual(user.xp, 0)
            self.assertEqual(
                session.query(self.UserProgress)
                .filter_by(user_id=user.id, challenge_id="cse-01-two-sum")
                .count(),
                0,
            )
        finally:
            session.close()

    def test_matlab_script_proxy_preserves_runtime_result_and_requires_auth(self):
        class EvaluatorResponse:
            status_code = 200

            @staticmethod
            def json():
                return {
                    "verdict": "EXECUTED",
                    "status": "executed",
                    "mode": "script",
                    "runtime": "GNU Octave",
                    "stdout": "2",
                    "stderr": "",
                    "artifacts": [],
                }

        with patch(
            "routers.evaluation.httpx.AsyncClient.post",
            new=AsyncMock(return_value=EvaluatorResponse()),
        ) as mocked_post:
            response = self.client.post(
                "/api/evaluation/matlab/script",
                json={"code": "disp(1);"},
                headers=self.headers(),
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["runtime"], "GNU Octave")
        forwarded = mocked_post.await_args.kwargs["json"]
        self.assertEqual(forwarded["mode"], "script")
        self.assertEqual(forwarded["language"], "matlab")

    def test_submission_history_is_current_user_scoped_and_newest_first(self):
        from models import Submission

        submission_ids = []
        challenge_id = "hardware-01-2to1-multiplexer"

        with patch(
            "routers.submissions.httpx.AsyncClient.post",
            new=AsyncMock(side_effect=RuntimeError("evaluator offline")),
        ):
            for token in (self.primary_token, self.primary_token, self.secondary_token):
                response = self.client.post(
                    "/api/submissions",
                    json={
                        "challenge_id": challenge_id,
                        "code": "module mux; endmodule",
                        "language": "verilog",
                    },
                    headers=self.headers(token),
                )
                self.assertEqual(response.status_code, 200)
                submission_ids.append(response.json()["id"])

        primary_history = self.client.get(
            f"/api/submissions/history?challenge_id={challenge_id}&limit=10",
            headers=self.headers(),
        )
        self.assertEqual(primary_history.status_code, 200)
        primary_items = primary_history.json()["items"]
        self.assertEqual({item["id"] for item in primary_items}, set(submission_ids[:2]))
        self.assertNotIn(submission_ids[2], {item["id"] for item in primary_items})
        self.assertTrue(all(item["status"] == "unavailable" for item in primary_items))
        self.assertTrue(all(item["retryable"] for item in primary_items))
        if len(primary_items) > 1:
            self.assertGreaterEqual(primary_items[0]["created_at"], primary_items[1]["created_at"])
        self.assertNotIn("code", primary_items[0])

        limited = self.client.get(
            f"/api/submissions/history?challenge_id={challenge_id}&limit=1",
            headers=self.headers(),
        )
        self.assertEqual(limited.status_code, 200)
        self.assertEqual(len(limited.json()["items"]), 1)

        session = self.main.SessionLocal()
        try:
            session.query(Submission).filter(Submission.id.in_(submission_ids)).delete(synchronize_session=False)
            session.commit()
        finally:
            session.close()

    def test_successful_evaluator_result_still_awards_real_challenge_xp(self):
        class EvaluatorResponse:
            status_code = 200

            @staticmethod
            def json():
                return {
                    "verdict": "AC",
                    "total_time_ms": 4.5,
                    "memory_used_kb": 256,
                    "output": "passed",
                    "test_results": [],
                }

        with patch(
            "routers.submissions.httpx.AsyncClient.post",
            new=AsyncMock(return_value=EvaluatorResponse()),
        ):
            response = self.client.post(
                "/api/submissions",
                json={
                    "challenge_id": "ai-01-perceptron-forward",
                    "code": "def two_sum(nums, target): return [0, 1]",
                    "language": "python",
                },
                headers=self.headers(),
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["verdict"], "AC")
        self.assertEqual(payload["status"], "evaluated")
        self.assertFalse(payload["retryable"])
        self.assertEqual(payload["xp_awarded"], 90)

    def test_virtual_hardware_projects_are_authenticated_owned_and_persistent(self):
        project = {
            "title": "LED bench",
            "description": "A private Uno exercise",
            "board_profile": "arduino-uno-r3",
            "project_version": 1,
            "graph": {
                "boardId": "arduino-uno-r3",
                "components": [],
                "wires": [],
                "selectedId": None,
            },
            "code": "void setup() {}\nvoid loop() {}",
            "guided_step": "build",
            "completed_steps": ["build"],
            "simulation_config": {"led": "off"},
        }
        created = self.client.post(
            "/api/virtual-hardware/projects",
            json=project,
            headers=self.headers(self.primary_token),
        )
        self.assertEqual(created.status_code, 201, created.text)
        created_payload = created.json()
        project_id = created_payload["id"]
        self.assertEqual(created_payload["graph"]["boardId"], "arduino-uno-r3")
        self.assertEqual(created_payload["completed_steps"], ["build"])

        listed = self.client.get(
            "/api/virtual-hardware/projects",
            headers=self.headers(self.primary_token),
        )
        self.assertEqual(listed.status_code, 200)
        self.assertIn(project_id, {item["id"] for item in listed.json()["items"]})

        loaded = self.client.get(
            f"/api/virtual-hardware/projects/{project_id}",
            headers=self.headers(self.primary_token),
        )
        self.assertEqual(loaded.status_code, 200)
        self.assertEqual(loaded.json()["title"], "LED bench")

        forbidden_read = self.client.get(
            f"/api/virtual-hardware/projects/{project_id}",
            headers=self.headers(self.secondary_token),
        )
        self.assertEqual(forbidden_read.status_code, 404)

        updated = self.client.patch(
            f"/api/virtual-hardware/projects/{project_id}",
            json={"title": "LED bench renamed", "guided_step": "validate"},
            headers=self.headers(self.primary_token),
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json()["title"], "LED bench renamed")
        self.assertEqual(updated.json()["guided_step"], "validate")

        completed_update = self.client.patch(
            f"/api/virtual-hardware/projects/{project_id}",
            json={"completed_steps": ["build", "validate"], "simulation_config": {"runtime": "restricted Arduino educational runtime"}},
            headers=self.headers(self.primary_token),
        )
        self.assertEqual(completed_update.status_code, 200)
        self.assertEqual(completed_update.json()["completed_steps"], ["build", "validate"])

        invalid_completed_steps = self.client.patch(
            f"/api/virtual-hardware/projects/{project_id}",
            json={"completed_steps": ["build", "build"]},
            headers=self.headers(self.primary_token),
        )
        self.assertEqual(invalid_completed_steps.status_code, 422)

        invalid_update = self.client.patch(
            f"/api/virtual-hardware/projects/{project_id}",
            json={
                "graph": {
                    "boardId": "arduino-uno-r3",
                    "components": [
                        {"id": "same", "type": "led", "position": [0, 0]},
                        {"id": "same", "type": "led", "position": [1, 0]},
                    ],
                    "wires": [],
                }
            },
            headers=self.headers(self.primary_token),
        )
        self.assertEqual(invalid_update.status_code, 422)

        invalid_wire = self.client.patch(
            f"/api/virtual-hardware/projects/{project_id}",
            json={
                "graph": {
                    "boardId": "arduino-uno-r3",
                    "components": [],
                    "wires": [{
                        "id": "wire-1",
                        "from": {"ownerId": "missing", "pinId": "anode", "kind": "component-pin"},
                        "to": {"ownerId": "board", "pinId": "D8", "kind": "board-pin"},
                    }],
                }
            },
            headers=self.headers(self.primary_token),
        )
        self.assertEqual(invalid_wire.status_code, 422)

        invalid_pin = self.client.patch(
            f"/api/virtual-hardware/projects/{project_id}",
            json={
                "graph": {
                    "boardId": "arduino-uno-r3",
                    "components": [{"id": "led-1", "type": "led", "position": [0, 0]}],
                    "wires": [{
                        "id": "wire-1",
                        "from": {"ownerId": "led-1", "pinId": "anode", "kind": "component-pin"},
                        "to": {"ownerId": "board", "pinId": "D99", "kind": "board-pin"},
                    }],
                }
            },
            headers=self.headers(self.primary_token),
        )
        self.assertEqual(invalid_pin.status_code, 422)

        forbidden_update = self.client.patch(
            f"/api/virtual-hardware/projects/{project_id}",
            json={"title": "stolen"},
            headers=self.headers(self.secondary_token),
        )
        self.assertEqual(forbidden_update.status_code, 404)

        duplicate = self.client.post(
            f"/api/virtual-hardware/projects/{project_id}/duplicate",
            headers=self.headers(self.primary_token),
        )
        self.assertEqual(duplicate.status_code, 201)
        duplicate_id = duplicate.json()["id"]
        self.assertNotEqual(duplicate_id, project_id)

        invalid_board = self.client.post(
            "/api/virtual-hardware/projects",
            json={**project, "board_profile": "esp32-devkit-v1"},
            headers=self.headers(self.primary_token),
        )
        self.assertEqual(invalid_board.status_code, 422)

        malformed = self.client.post(
            "/api/virtual-hardware/projects",
            json={**project, "graph": {"boardId": "arduino-uno-r3", "components": [{"id": "same", "type": "led", "position": [0, 0]}, {"id": "same", "type": "led", "position": [1, 0]}], "wires": []}},
            headers=self.headers(self.primary_token),
        )
        self.assertEqual(malformed.status_code, 422)

        oversized = self.client.post(
            "/api/virtual-hardware/projects",
            json={**project, "code": "x" * (256 * 1024 + 1)},
            headers=self.headers(self.primary_token),
        )
        self.assertEqual(oversized.status_code, 422)

        deleted = self.client.delete(
            f"/api/virtual-hardware/projects/{duplicate_id}",
            headers=self.headers(self.primary_token),
        )
        self.assertEqual(deleted.status_code, 204)
        self.assertEqual(self.client.get(f"/api/virtual-hardware/projects/{duplicate_id}", headers=self.headers()).status_code, 404)

        deleted = self.client.delete(
            f"/api/virtual-hardware/projects/{project_id}",
            headers=self.headers(self.primary_token),
        )
        self.assertEqual(deleted.status_code, 204)


if __name__ == "__main__":
    unittest.main()
