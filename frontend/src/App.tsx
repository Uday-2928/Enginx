import React, { useState, useEffect } from 'react';
import { Header } from './components/layout/Header';
import { ChallengeList } from './components/challenges/ChallengeList';
import { ChallengeDetails } from './components/challenges/ChallengeDetails';
import { CodeEditor } from './components/editor/CodeEditor';
import { SkillTree } from './components/dashboard/SkillTree';
import { BadgeCollection } from './components/dashboard/BadgeCollection';
import { Leaderboard } from './components/dashboard/Leaderboard';
import { OnboardingModal } from './components/onboarding/OnboardingModal';
import { Challenge, Discipline, SubmissionResult, Badge } from './types';
import { INITIAL_CHALLENGES } from './data/challenges';
import { INITIAL_BADGES } from './data/badges';
import { fetchChallenges, submitSolution } from './services/api';

export function App() {
  const [currentTab, setCurrentTab] = useState<'challenges' | 'skill-tree' | 'badges' | 'leaderboard'>('challenges');
  const [challenges, setChallenges] = useState<Challenge[]>(INITIAL_CHALLENGES);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge>(INITIAL_CHALLENGES[0]);
  const [code, setCode] = useState<string>(INITIAL_CHALLENGES[0].starter_code);
  const [selectedDiscipline, setSelectedDiscipline] = useState<Discipline>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // User state
  const [userXp, setUserXp] = useState<number>(350);
  const [streakDays, setStreakDays] = useState<number>(5);
  const [userRole, setUserRole] = useState<string>('ECE');
  const [userName, setUserName] = useState<string>('Alex Rivera');
  const [completedIds, setCompletedIds] = useState<string[]>(['cse-01-two-sum']);
  const [badges, setBadges] = useState<Badge[]>(INITIAL_BADGES);

  // Evaluation state
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);

  // Modals & Theme
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // Sync starter code when challenge switches
  useEffect(() => {
    setCode(selectedChallenge.starter_code);
    setSubmissionResult(null);
  }, [selectedChallenge]);

  // Filter challenges based on track & search
  useEffect(() => {
    fetchChallenges(selectedDiscipline, searchQuery).then(data => {
      setChallenges(data);
    });
  }, [selectedDiscipline, searchQuery]);

  const handleRunCode = async () => {
    setIsEvaluating(true);
    const result = await submitSolution(selectedChallenge, code, selectedChallenge.language);
    setSubmissionResult(result);
    setIsEvaluating(false);
  };

  const handleSubmitCode = async () => {
    setIsEvaluating(true);
    const result = await submitSolution(selectedChallenge, code, selectedChallenge.language);
    setSubmissionResult(result);
    setIsEvaluating(false);

    if (result.verdict === 'AC') {
      if (!completedIds.includes(selectedChallenge.id)) {
        setCompletedIds(prev => [...prev, selectedChallenge.id]);
        setUserXp(prev => prev + result.xp_awarded);
      }

      // Check badge unlock
      if (selectedChallenge.discipline === 'ece-verilog') {
        setBadges(prev => prev.map(b => b.id === 'badge-verilog-virtuoso' ? { ...b, earned: true } : b));
      } else if (selectedChallenge.discipline === 'ece-embedded') {
        setBadges(prev => prev.map(b => b.id === 'badge-embedded-master' ? { ...b, earned: true } : b));
      } else if (selectedChallenge.discipline === 'ai-ml') {
        setBadges(prev => prev.map(b => b.id === 'badge-neural-architect' ? { ...b, earned: true } : b));
      } else if (selectedChallenge.discipline === 'cybersecurity') {
        setBadges(prev => prev.map(b => b.id === 'badge-ctf-hunter' ? { ...b, earned: true } : b));
      } else if (selectedChallenge.discipline === 'robotics') {
        setBadges(prev => prev.map(b => b.id === 'badge-kinematics-commander' ? { ...b, earned: true } : b));
      }
    }
  };

  const handleSelectRole = (role: string, name: string) => {
    setUserRole(role);
    setUserName(name);
    // Auto-filter challenges to match selected track
    if (role === 'CSE') setSelectedDiscipline('cse');
    else if (role === 'ECE') setSelectedDiscipline('ece-verilog');
    else if (role === 'AI') setSelectedDiscipline('ai-ml');
    else if (role === 'CYBER') setSelectedDiscipline('cybersecurity');
    else if (role === 'ROBOTICS') setSelectedDiscipline('robotics');
    else if (role === 'HARDWARE') setSelectedDiscipline('hardware');
  };

  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? 'dark bg-[#0B0F17]' : 'bg-slate-50 text-slate-900'}`}>
      {/* Platform Header */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        selectedDiscipline={selectedDiscipline}
        setSelectedDiscipline={setSelectedDiscipline}
        userXp={userXp}
        streakDays={streakDays}
        isDarkMode={isDarkMode}
        toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        onOpenOnboarding={() => setIsOnboardingOpen(true)}
        userRole={userRole}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {currentTab === 'challenges' && (
          <div className="flex-1 max-w-[1720px] w-full mx-auto p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 overflow-hidden h-[calc(100vh-4rem)]">
            {/* Left Column: Challenge Navigator (3 cols) */}
            <div className="lg:col-span-3 h-full overflow-hidden">
              <ChallengeList
                challenges={challenges}
                selectedChallengeId={selectedChallenge.id}
                onSelectChallenge={(c) => setSelectedChallenge(c)}
                completedIds={completedIds}
                selectedDiscipline={selectedDiscipline}
                setSelectedDiscipline={setSelectedDiscipline}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
              />
            </div>

            {/* Middle Column: Problem Statement & Specs (4 cols) */}
            <div className="lg:col-span-4 h-full overflow-hidden">
              <ChallengeDetails
                challenge={selectedChallenge}
                isCompleted={completedIds.includes(selectedChallenge.id)}
              />
            </div>

            {/* Right Column: Code Editor & Simulation Output (5 cols) */}
            <div className="lg:col-span-5 h-full overflow-hidden">
              <CodeEditor
                challenge={selectedChallenge}
                code={code}
                setCode={setCode}
                onRun={handleRunCode}
                onSubmit={handleSubmitCode}
                isEvaluating={isEvaluating}
                submissionResult={submissionResult}
                onResetCode={() => setCode(selectedChallenge.starter_code)}
              />
            </div>
          </div>
        )}

        {currentTab === 'skill-tree' && (
          <div className="flex-1 overflow-y-auto">
            <SkillTree
              challenges={INITIAL_CHALLENGES}
              completedIds={completedIds}
              onSelectChallenge={(c) => {
                setSelectedChallenge(c);
                setCurrentTab('challenges');
              }}
              selectedDiscipline={selectedDiscipline}
              setSelectedDiscipline={setSelectedDiscipline}
            />
          </div>
        )}

        {currentTab === 'badges' && (
          <div className="flex-1 overflow-y-auto">
            <BadgeCollection badges={badges} />
          </div>
        )}

        {currentTab === 'leaderboard' && (
          <div className="flex-1 overflow-y-auto">
            <Leaderboard />
          </div>
        )}
      </main>

      {/* Onboarding / Role Selection Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onSelectRole={handleSelectRole}
        currentRole={userRole}
      />
    </div>
  );
}

export default App;
