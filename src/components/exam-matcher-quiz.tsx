'use client';

import { useState } from 'react';
import { ArrowRight, RotateCw } from 'lucide-react';

interface Question {
  id: string;
  question: string;
  options: Array<{
    text: string;
    scores: {
      GATE: number;
      UPSC: number;
      SSC: number;
      Railway: number;
      Banking: number;
    };
  }>;
}

const QUESTIONS: Question[] = [
  {
    id: 'q1',
    question: "What's your primary goal?",
    options: [
      {
        text: 'Fast job & stable income',
        scores: { GATE: 2, UPSC: 0, SSC: 3, Railway: 3, Banking: 3 },
      },
      {
        text: 'Highest prestige & power',
        scores: { GATE: 1, UPSC: 5, SSC: 1, Railway: 0, Banking: 0 },
      },
      {
        text: 'Best long-term salary',
        scores: { GATE: 5, UPSC: 4, SSC: 2, Railway: 1, Banking: 4 },
      },
      {
        text: 'Good balance of all',
        scores: { GATE: 3, UPSC: 2, SSC: 3, Railway: 2, Banking: 3 },
      },
    ],
  },
  {
    id: 'q2',
    question: 'How much time can you dedicate to preparation?',
    options: [
      {
        text: '6 months',
        scores: { GATE: 0, UPSC: 0, SSC: 4, Railway: 4, Banking: 5 },
      },
      {
        text: '12 months',
        scores: { GATE: 3, UPSC: 1, SSC: 5, Railway: 4, Banking: 4 },
      },
      {
        text: '18-24 months',
        scores: { GATE: 5, UPSC: 3, SSC: 3, Railway: 3, Banking: 2 },
      },
      {
        text: '24+ months (no pressure)',
        scores: { GATE: 4, UPSC: 5, SSC: 2, Railway: 2, Banking: 1 },
      },
    ],
  },
  {
    id: 'q3',
    question: 'How strong is your academic background?',
    options: [
      {
        text: 'Average - just passed school',
        scores: { GATE: 0, UPSC: 1, SSC: 4, Railway: 4, Banking: 3 },
      },
      {
        text: 'Good - decent college marks',
        scores: { GATE: 3, UPSC: 2, SSC: 5, Railway: 3, Banking: 4 },
      },
      {
        text: 'Excellent - top of class',
        scores: { GATE: 5, UPSC: 4, SSC: 2, Railway: 2, Banking: 2 },
      },
      {
        text: 'Exceptional - competitive exams experience',
        scores: { GATE: 5, UPSC: 5, SSC: 3, Railway: 1, Banking: 2 },
      },
    ],
  },
  {
    id: 'q4',
    question: 'What type of work interests you most?',
    options: [
      {
        text: 'Technical & engineering work',
        scores: { GATE: 5, UPSC: 0, SSC: 1, Railway: 3, Banking: 0 },
      },
      {
        text: 'Administration & governance',
        scores: { GATE: 0, UPSC: 5, SSC: 4, Railway: 1, Banking: 1 },
      },
      {
        text: 'Banking & finance',
        scores: { GATE: 1, UPSC: 1, SSC: 2, Railway: 1, Banking: 5 },
      },
      {
        text: 'Any stable government job',
        scores: { GATE: 2, UPSC: 1, SSC: 3, Railway: 3, Banking: 2 },
      },
    ],
  },
  {
    id: 'q5',
    question: "What matters most to you in a career?",
    options: [
      {
        text: 'Job security & pension',
        scores: { GATE: 2, UPSC: 3, SSC: 5, Railway: 5, Banking: 4 },
      },
      {
        text: 'High salary growth',
        scores: { GATE: 5, UPSC: 4, SSC: 2, Railway: 1, Banking: 5 },
      },
      {
        text: 'Prestige & career opportunities',
        scores: { GATE: 3, UPSC: 5, SSC: 2, Railway: 1, Banking: 2 },
      },
      {
        text: 'Work-life balance',
        scores: { GATE: 1, UPSC: 1, SSC: 3, Railway: 2, Banking: 2 },
      },
    ],
  },
];

interface ExamResult {
  exam: 'GATE' | 'UPSC' | 'SSC' | 'Railway' | 'Banking';
  fullName: string;
  match: number;
  difficulty: string;
  prepMonths: number;
  entrySalary: string;
  description: string;
  learnMore: string;
}

const EXAM_DATA: { [key: string]: ExamResult } = {
  GATE: {
    exam: 'GATE',
    fullName: 'Graduate Aptitude Test in Engineering',
    match: 0,
    difficulty: 'Hard',
    prepMonths: 6,
    entrySalary: '₹35,000-50,000/month',
    description: 'Best for engineering graduates wanting high-paying PSU jobs. Requires strong technical knowledge.',
    learnMore: '/salary-guides/psu-salary-comparison',
  },
  UPSC: {
    exam: 'UPSC',
    fullName: 'Union Public Service Commission (IAS/IPS/IFS)',
    match: 0,
    difficulty: 'Very Hard',
    prepMonths: 12,
    entrySalary: '₹56,100/month',
    description: 'Highest prestige, most competitive. IAS is the dream career for many, but requires 2+ years preparation.',
    learnMore: '/comparisons/upsc-vs-ssc',
  },
  SSC: {
    exam: 'SSC',
    fullName: 'Staff Selection Commission (CHSL/CGL)',
    match: 0,
    difficulty: 'Medium',
    prepMonths: 6,
    entrySalary: '₹26,000-35,000/month',
    description: 'Fastest way to secure government job. Excellent growth trajectory with promotion potential.',
    learnMore: '/salary-guides/government-job-salary-by-grade',
  },
  Railway: {
    exam: 'Railway',
    fullName: 'Railway Recruitment Board (RRB)',
    match: 0,
    difficulty: 'Easy-Medium',
    prepMonths: 3,
    entrySalary: '₹22,000-30,000/month',
    description: 'Easiest to crack among government exams. Rapid job security with growth opportunities.',
    learnMore: '/salary-guides/railway-salary-guide',
  },
  Banking: {
    exam: 'Banking',
    fullName: 'Banking (IBPS/SBI)',
    match: 0,
    difficulty: 'Medium',
    prepMonths: 4,
    entrySalary: '₹18,000-25,000/month',
    description: 'Fastest entry at lowest difficulty. Best salary growth trajectory in government sector.',
    learnMore: '/salary-guides/banking-salary-guide',
  },
};

export default function ExamMatcherQuiz() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [scores, setScores] = useState({ GATE: 0, UPSC: 0, SSC: 0, Railway: 0, Banking: 0 });
  const [showResults, setShowResults] = useState(false);

  const handleAnswer = (selectedOption: Question['options'][0]) => {
    const newScores = { ...scores };
    Object.keys(selectedOption.scores).forEach((exam) => {
      newScores[exam as keyof typeof scores] += selectedOption.scores[exam as keyof typeof selectedOption.scores];
    });
    setScores(newScores);

    if (currentQuestion < QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setShowResults(true);
    }
  };

  const reset = () => {
    setCurrentQuestion(0);
    setScores({ GATE: 0, UPSC: 0, SSC: 0, Railway: 0, Banking: 0 });
    setShowResults(false);
  };

  const getResults = (): ExamResult[] => {
    const results = Object.entries(scores).map(([exam, score]) => ({
      ...(EXAM_DATA[exam] as ExamResult),
      match: score,
    }));
    return results.sort((a, b) => b.match - a.match);
  };

  const getMatchPercentage = (score: number, maxScore: number) => {
    return Math.round((score / maxScore) * 100);
  };

  const maxPossibleScore = 25; // 5 questions × 5 max points each

  if (showResults) {
    const results = getResults();
    return (
      <div className="w-full max-w-4xl mx-auto p-6 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg">
        <h2 className="text-3xl font-bold mb-2 text-gray-900">Your Exam Matches</h2>
        <p className="text-gray-600 mb-8">Here are the government exams best suited for your profile:</p>

        <div className="space-y-6 mb-8">
          {results.slice(0, 3).map((result, idx) => {
            const percentage = getMatchPercentage(result.match, maxPossibleScore);
            return (
              <div key={result.exam} className={`rounded-lg overflow-hidden shadow-lg ${
                idx === 0 ? 'border-4 border-gold-500 bg-gradient-to-r from-amber-50 to-yellow-50' :
                idx === 1 ? 'border-2 border-gray-400 bg-gray-50' :
                idx === 2 ? 'border-2 border-orange-300 bg-orange-50' :
                'bg-white'
              }`}>
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl font-bold">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                        <h3 className="text-2xl font-bold text-gray-900">{result.exam}</h3>
                      </div>
                      <p className="text-sm text-gray-600">{result.fullName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-4xl font-bold text-green-600">{percentage}%</p>
                      <p className="text-xs text-gray-500">Match Score</p>
                    </div>
                  </div>

                  {/* Match Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-4 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-green-400 to-green-600 h-full rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 text-sm">
                    <div>
                      <p className="text-gray-600">Difficulty</p>
                      <p className="font-semibold">{result.difficulty}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Prep Time</p>
                      <p className="font-semibold">{result.prepMonths} months</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Entry Salary</p>
                      <p className="font-semibold text-green-600">{result.entrySalary}</p>
                    </div>
                    <div>
                      <a
                        href={result.learnMore}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold"
                      >
                        Learn More <ArrowRight size={16} />
                      </a>
                    </div>
                  </div>

                  <p className="text-gray-700 text-sm">{result.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={reset}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition w-full justify-center"
        >
          <RotateCw size={18} />
          Retake Quiz
        </button>

        <div className="mt-6 p-4 bg-blue-100 rounded-lg text-sm text-gray-700">
          <p>
            <strong>Next Step:</strong> Use our Salary Predictor to estimate your lifetime earnings for each exam, or check out the detailed comparison pages above.
          </p>
        </div>
      </div>
    );
  }

  const question = QUESTIONS[currentQuestion];
  const progress = ((currentQuestion + 1) / QUESTIONS.length) * 100;

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg">
      <h2 className="text-3xl font-bold mb-2 text-gray-900">Exam Matcher Quiz</h2>
      <p className="text-gray-600 mb-8">Answer 5 quick questions to find your perfect government exam match.</p>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between mb-2 text-sm">
          <span className="font-semibold text-gray-700">Question {currentQuestion + 1} of {QUESTIONS.length}</span>
          <span className="text-gray-500">{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="bg-white p-8 rounded-lg shadow-lg mb-8">
        <h3 className="text-2xl font-bold mb-6 text-gray-900">{question.question}</h3>

        {/* Options */}
        <div className="space-y-3">
          {question.options.map((option, idx) => (
            <button
              key={idx}
              onClick={() => handleAnswer(option)}
              className="w-full text-left p-4 rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition duration-200 group"
            >
              <p className="font-semibold text-gray-900 group-hover:text-blue-600">{option.text}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Help Text */}
      <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded text-sm text-gray-700">
        <p>💡 Your answers are weighted by how well each choice predicts success in different exams. Choose honestly!</p>
      </div>
    </div>
  );
}
