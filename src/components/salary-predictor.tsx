'use client';

import { useState } from 'react';
import { ArrowRight, Share2, Copy, Check } from 'lucide-react';

interface SalaryData {
  [key: string]: {
    [key: string]: {
      0: number;
      5: number;
      10: number;
      15: number;
      20: number;
      25: number;
    };
  };
}

const SALARY_DATA: SalaryData = {
  'B.Tech': {
    'GATE (PSU)': { 0: 35000, 5: 52000, 10: 72000, 15: 95000, 20: 125000, 25: 160000 },
    'UPSC (IAS)': { 0: 56100, 5: 75000, 10: 110000, 15: 180000, 20: 250000, 25: 300000 },
    'SSC (Group B)': { 0: 28000, 5: 42000, 10: 62000, 15: 82000, 20: 105000, 25: 130000 },
    'Railway': { 0: 25000, 5: 38000, 10: 52000, 15: 68000, 20: 85000, 25: 105000 },
    'Banking': { 0: 20000, 5: 38000, 10: 65000, 15: 95000, 20: 140000, 25: 180000 },
  },
  'M.Tech': {
    'GATE (PSU)': { 0: 40000, 5: 58000, 10: 80000, 15: 108000, 20: 142000, 25: 180000 },
    'UPSC (IAS)': { 0: 56100, 5: 75000, 10: 110000, 15: 180000, 20: 250000, 25: 300000 },
    'SSC (Group B)': { 0: 30000, 5: 45000, 10: 65000, 15: 85000, 20: 108000, 25: 135000 },
    'Railway': { 0: 28000, 5: 42000, 10: 58000, 15: 75000, 20: 92000, 25: 112000 },
    'Banking': { 0: 22000, 5: 42000, 10: 72000, 15: 105000, 20: 155000, 25: 200000 },
  },
  'MBA': {
    'GATE (PSU)': { 0: 42000, 5: 62000, 10: 85000, 15: 115000, 20: 150000, 25: 190000 },
    'UPSC (IAS)': { 0: 56100, 5: 75000, 10: 110000, 15: 180000, 20: 250000, 25: 300000 },
    'SSC (Group B)': { 0: 32000, 5: 48000, 10: 70000, 15: 90000, 20: 115000, 25: 142000 },
    'Railway': { 0: 30000, 5: 45000, 10: 62000, 15: 80000, 20: 98000, 25: 120000 },
    'Banking': { 0: 25000, 5: 48000, 10: 82000, 15: 120000, 20: 175000, 25: 220000 },
  },
  'B.Com': {
    'GATE (PSU)': { 0: 28000, 5: 40000, 10: 58000, 15: 78000, 20: 105000, 25: 135000 },
    'UPSC (IAS)': { 0: 56100, 5: 75000, 10: 110000, 15: 180000, 20: 250000, 25: 300000 },
    'SSC (Group B)': { 0: 26000, 5: 38000, 10: 56000, 15: 75000, 20: 98000, 25: 125000 },
    'Railway': { 0: 22000, 5: 32000, 10: 48000, 15: 65000, 20: 82000, 25: 105000 },
    'Banking': { 0: 18000, 5: 32000, 10: 58000, 15: 85000, 20: 125000, 25: 165000 },
  },
};

export default function SalaryPredictor() {
  const [qualification, setQualification] = useState('B.Tech');
  const [jobPath, setJobPath] = useState('GATE (PSU)');
  const [experience, setExperience] = useState(10);
  const [copied, setCopied] = useState(false);

  const qualifications = Object.keys(SALARY_DATA);
  const paths = Object.keys(SALARY_DATA[qualification] || {});
  const monthlySalary = SALARY_DATA[qualification]?.[jobPath]?.[experience as keyof typeof SALARY_DATA['B.Tech']['GATE (PSU)']] || 0;

  const monthlyBonus = Math.round(monthlySalary * 0.15);
  const annualBonus = monthlyBonus * 12;
  const lifetimeEarnings = (monthlySalary * 12 * 30) + (annualBonus * 25); // 30 years salary + 25 years pension

  const shareLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/tools/salary-predictor?qual=${qualification}&path=${encodeURIComponent(jobPath)}&exp=${experience}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatCurrency = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)} Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)} L`;
    return `₹${value.toLocaleString()}`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2 text-gray-900">Government Job Salary Predictor</h2>
        <p className="text-gray-600">See your estimated salary and lifetime earnings based on your qualification and career path.</p>
      </div>

      {/* Input Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 bg-white p-6 rounded-lg shadow">
        <div>
          <label className="block text-sm font-semibold mb-2 text-gray-700">Qualification</label>
          <select
            value={qualification}
            onChange={(e) => {
              setQualification(e.target.value);
              setJobPath(Object.keys(SALARY_DATA[e.target.value])[0]);
            }}
            className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition"
          >
            {qualifications.map((q) => (
              <option key={q} value={q}>{q}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-gray-700">Government Job Path</label>
          <select
            value={jobPath}
            onChange={(e) => setJobPath(e.target.value)}
            className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition"
          >
            {paths.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-gray-700">Years of Experience</label>
          <select
            value={experience}
            onChange={(e) => setExperience(Number(e.target.value))}
            className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition"
          >
            {[0, 5, 10, 15, 20, 25].map((y) => (
              <option key={y} value={y}>{y} years</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {/* Monthly Salary */}
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white p-6 rounded-lg shadow-lg">
          <p className="text-sm opacity-90 mb-2">Monthly In-Hand Salary</p>
          <p className="text-2xl font-bold">{formatCurrency(monthlySalary)}</p>
          <p className="text-xs mt-2 opacity-75">+₹{(monthlySalary * 0.2).toLocaleString()} DA & allowances</p>
        </div>

        {/* Annual Bonus */}
        <div className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white p-6 rounded-lg shadow-lg">
          <p className="text-sm opacity-90 mb-2">Annual Bonus (13th Month)</p>
          <p className="text-2xl font-bold">{formatCurrency(annualBonus)}</p>
          <p className="text-xs mt-2 opacity-75">2-3 months extra</p>
        </div>

        {/* 30-Year Career Earnings */}
        <div className="bg-gradient-to-br from-purple-500 to-pink-600 text-white p-6 rounded-lg shadow-lg">
          <p className="text-sm opacity-90 mb-2">30-Year Career Earnings</p>
          <p className="text-2xl font-bold">{formatCurrency(monthlySalary * 12 * 30)}</p>
          <p className="text-xs mt-2 opacity-75">Salary only, excluding pension</p>
        </div>

        {/* Lifetime Total */}
        <div className="bg-gradient-to-br from-orange-500 to-red-600 text-white p-6 rounded-lg shadow-lg">
          <p className="text-sm opacity-90 mb-2">Lifetime Total (w/ Pension)</p>
          <p className="text-2xl font-bold">{formatCurrency(lifetimeEarnings)}</p>
          <p className="text-xs mt-2 opacity-75">30yr salary + 25yr pension</p>
        </div>
      </div>

      {/* Additional Benefits */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg border-l-4 border-green-500">
          <p className="font-semibold text-gray-900 mb-2">Medical & Housing</p>
          <p className="text-sm text-gray-600">CGHS coverage + free housing benefits worth ₹20,000-50,000/mo</p>
        </div>
        <div className="bg-white p-4 rounded-lg border-l-4 border-blue-500">
          <p className="font-semibold text-gray-900 mb-2">Pension for Life</p>
          <p className="text-sm text-gray-600">50% of average salary guaranteed for retirement (25+ years)</p>
        </div>
        <div className="bg-white p-4 rounded-lg border-l-4 border-purple-500">
          <p className="font-semibold text-gray-900 mb-2">Job Security</p>
          <p className="text-sm text-gray-600">Permanent job with guaranteed increments and growth</p>
        </div>
      </div>

      {/* Share Button */}
      <div className="flex gap-3 justify-center">
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
        >
          {copied ? (
            <>
              <Check size={18} />
              Link Copied!
            </>
          ) : (
            <>
              <Share2 size={18} />
              Share Your Result
            </>
          )}
        </button>
      </div>

      {/* Comparison Note */}
      <div className="mt-8 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
        <p className="text-sm text-gray-700">
          💡 <strong>Tip:</strong> Government jobs often beat private sector by year 15 when you factor in pension, medical benefits, and housing security. Compare with your private sector offer using our ROI calculator.
        </p>
      </div>
    </div>
  );
}
