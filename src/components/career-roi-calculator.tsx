'use client';

import { useState } from 'react';
import { Download, ArrowRight } from 'lucide-react';

interface CareerPath {
  name: string;
  fullName: string;
  entrySalary: number;
  salaryAt10: number;
  salaryAt20: number;
  salaryAt30: number;
  pensionPercentage: number;
  bonusPercentage: number;
  difficulty: string;
  prepCost: number; // in rupees
}

const CAREER_DATA: { [key: string]: CareerPath } = {
  'IAS (UPSC)': {
    name: 'IAS (UPSC)',
    fullName: 'Union Public Service Commission - IAS Officer',
    entrySalary: 56100,
    salaryAt10: 110000,
    salaryAt20: 180000,
    salaryAt30: 250000,
    pensionPercentage: 50,
    bonusPercentage: 25,
    difficulty: 'Very Hard',
    prepCost: 200000,
  },
  'SSC CHSL': {
    name: 'SSC CHSL',
    fullName: 'Staff Selection Commission - Combined Higher Secondary',
    entrySalary: 26000,
    salaryAt10: 56000,
    salaryAt20: 85000,
    salaryAt30: 105000,
    pensionPercentage: 50,
    bonusPercentage: 20,
    difficulty: 'Medium',
    prepCost: 50000,
  },
  'GATE (PSU)': {
    name: 'GATE (PSU)',
    fullName: 'Graduate Aptitude Test in Engineering - PSU Job',
    entrySalary: 40000,
    salaryAt10: 72000,
    salaryAt20: 125000,
    salaryAt30: 160000,
    pensionPercentage: 50,
    bonusPercentage: 15,
    difficulty: 'Hard',
    prepCost: 150000,
  },
  'Railway RRB': {
    name: 'Railway RRB',
    fullName: 'Railway Recruitment Board',
    entrySalary: 25000,
    salaryAt10: 52000,
    salaryAt20: 85000,
    salaryAt30: 105000,
    pensionPercentage: 50,
    bonusPercentage: 15,
    difficulty: 'Easy-Medium',
    prepCost: 30000,
  },
  'Banking IBPS': {
    name: 'Banking IBPS',
    fullName: 'Institute of Banking Personnel Selection - Banking Clerk',
    entrySalary: 20000,
    salaryAt10: 65000,
    salaryAt20: 140000,
    salaryAt30: 180000,
    pensionPercentage: 50,
    bonusPercentage: 20,
    difficulty: 'Medium',
    prepCost: 40000,
  },
  'State PSC': {
    name: 'State PSC',
    fullName: 'State Public Service Commission',
    entrySalary: 32000,
    salaryAt10: 62000,
    salaryAt20: 95000,
    salaryAt30: 125000,
    pensionPercentage: 50,
    bonusPercentage: 20,
    difficulty: 'Hard',
    prepCost: 100000,
  },
};

const paths = Object.keys(CAREER_DATA);

export default function CareerROICalculator() {
  const [path1, setPath1] = useState('IAS (UPSC)');
  const [path2, setPath2] = useState('SSC CHSL');
  const [yearsOfService, setYearsOfService] = useState(30);

  const calculateLifetimeEarnings = (career: CareerPath, years: number) => {
    const baseSalaries = [
      { years: 0, salary: career.entrySalary },
      { years: 10, salary: career.salaryAt10 },
      { years: 20, salary: career.salaryAt20 },
      { years: 30, salary: career.salaryAt30 },
    ];

    let totalEarnings = 0;

    // Calculate year by year earnings
    for (let year = 0; year < years; year++) {
      let salary = career.entrySalary;
      if (year >= 30) salary = career.salaryAt30;
      else if (year >= 20) {
        const ratio = (year - 20) / 10;
        salary = career.salaryAt20 + (career.salaryAt30 - career.salaryAt20) * ratio;
      } else if (year >= 10) {
        const ratio = (year - 10) / 10;
        salary = career.salaryAt10 + (career.salaryAt20 - career.salaryAt10) * ratio;
      } else {
        const ratio = year / 10;
        salary = career.entrySalary + (career.salaryAt10 - career.entrySalary) * ratio;
      }

      const annualSalary = salary * 12;
      const bonus = annualSalary * (career.bonusPercentage / 100);
      totalEarnings += annualSalary + bonus;
    }

    // Add pension (assuming 25 years post-retirement)
    const averageSalary = (career.salaryAt30 * 12) + (career.salaryAt30 * 12 * career.bonusPercentage / 100);
    const monthlyPension = (averageSalary / 12) * (career.pensionPercentage / 100);
    const pensionYears = Math.max(0, 25); // 25 years of pension assumed
    const totalPension = monthlyPension * 12 * pensionYears;

    return {
      salary: totalEarnings,
      pension: totalPension,
      total: totalEarnings + totalPension,
    };
  };

  const calculateHousingBenefit = (baseSalary: number) => {
    return (baseSalary * 0.15) * 12 * 30; // Estimated 15% HRA for 30 years
  };

  const calculateMedicalBenefit = () => {
    return 200000 * 30; // Estimated ₹200k/year medical benefit
  };

  const career1 = CAREER_DATA[path1];
  const career2 = CAREER_DATA[path2];

  const earnings1 = calculateLifetimeEarnings(career1, yearsOfService);
  const earnings2 = calculateLifetimeEarnings(career2, yearsOfService);

  const housing1 = calculateHousingBenefit(career1.salaryAt30);
  const housing2 = calculateHousingBenefit(career2.salaryAt30);

  const medical1 = calculateMedicalBenefit();
  const medical2 = calculateMedicalBenefit();

  const totalComp1 = earnings1.total + housing1 + medical1;
  const totalComp2 = earnings2.total + housing2 + medical2;

  const roi1 = (totalComp1 / (earnings1.salary + career1.prepCost)) * 100;
  const roi2 = (totalComp2 / (earnings2.salary + career2.prepCost)) * 100;

  const breakEvenYears1 = (career1.entrySalary > career2.entrySalary) ? 0 : Math.ceil((career2.entrySalary - career1.entrySalary) * 12 / ((career1.salaryAt10 - career1.entrySalary) / 10));
  const breakEvenYears2 = (career2.entrySalary > career1.entrySalary) ? 0 : Math.ceil((career1.entrySalary - career2.entrySalary) * 12 / ((career2.salaryAt10 - career2.entrySalary) / 10));

  const formatCurrency = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`;
    return `₹${value.toLocaleString()}`;
  };

  const downloadComparison = () => {
    const text = `CAREER ROI COMPARISON
${path1} vs ${path2} (${yearsOfService} years)

${path1}:
- Entry Salary: ${formatCurrency(career1.entrySalary * 12)}
- Salary at 10 years: ${formatCurrency(career1.salaryAt10 * 12)}
- Salary at 20 years: ${formatCurrency(career1.salaryAt20 * 12)}
- Salary at 30 years: ${formatCurrency(career1.salaryAt30 * 12)}
- Total 30-Year Earnings: ${formatCurrency(earnings1.salary)}
- Pension Value: ${formatCurrency(earnings1.pension)}
- Housing Benefits: ${formatCurrency(housing1)}
- Medical Benefits: ${formatCurrency(medical1)}
- TOTAL LIFETIME COMPENSATION: ${formatCurrency(totalComp1)}

${path2}:
- Entry Salary: ${formatCurrency(career2.entrySalary * 12)}
- Salary at 10 years: ${formatCurrency(career2.salaryAt10 * 12)}
- Salary at 20 years: ${formatCurrency(career2.salaryAt20 * 12)}
- Salary at 30 years: ${formatCurrency(career2.salaryAt30 * 12)}
- Total 30-Year Earnings: ${formatCurrency(earnings2.salary)}
- Pension Value: ${formatCurrency(earnings2.pension)}
- Housing Benefits: ${formatCurrency(housing2)}
- Medical Benefits: ${formatCurrency(medical2)}
- TOTAL LIFETIME COMPENSATION: ${formatCurrency(totalComp2)}

VERDICT:
${totalComp1 > totalComp2
  ? `${path1} offers ${formatCurrency(totalComp1 - totalComp2)} more lifetime compensation`
  : `${path2} offers ${formatCurrency(totalComp2 - totalComp1)} more lifetime compensation`
}`;

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', `career-roi-${path1}-vs-${path2}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg">
      <h2 className="text-3xl font-bold mb-2 text-gray-900">Career ROI Calculator</h2>
      <p className="text-gray-600 mb-8">Compare two government job paths to see lifetime earnings, benefits, and ROI.</p>

      {/* Input Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 bg-white p-6 rounded-lg shadow">
        <div>
          <label className="block text-sm font-semibold mb-2 text-gray-700">Path 1</label>
          <select
            value={path1}
            onChange={(e) => setPath1(e.target.value)}
            className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition"
          >
            {paths.filter(p => p !== path2).map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-gray-700">Path 2</label>
          <select
            value={path2}
            onChange={(e) => setPath2(e.target.value)}
            className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition"
          >
            {paths.filter(p => p !== path1).map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-gray-700">Career Length</label>
          <select
            value={yearsOfService}
            onChange={(e) => setYearsOfService(Number(e.target.value))}
            className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition"
          >
            <option value={10}>10 years</option>
            <option value={20}>20 years</option>
            <option value={30}>30 years (Full)</option>
          </select>
        </div>
      </div>

      {/* Side-by-Side Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Path 1 */}
        <div className={`rounded-lg shadow-lg p-6 ${path1.includes('IAS') ? 'bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-300' : 'bg-white'}`}>
          <h3 className="text-2xl font-bold mb-4 text-gray-900">{career1.name}</h3>
          <p className="text-sm text-gray-600 mb-4">{career1.fullName}</p>

          <div className="space-y-3 mb-6 bg-white/50 p-4 rounded">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Entry Salary</span>
              <span className="font-bold text-lg text-green-600">{formatCurrency(career1.entrySalary * 12)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">At 10 years</span>
              <span className="font-bold text-lg">{formatCurrency(career1.salaryAt10 * 12)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">At 20 years</span>
              <span className="font-bold text-lg">{formatCurrency(career1.salaryAt20 * 12)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">At 30 years</span>
              <span className="font-bold text-lg">{formatCurrency(career1.salaryAt30 * 12)}</span>
            </div>
          </div>

          <div className="space-y-3 mb-6 text-sm">
            <div className="flex justify-between items-center bg-green-50 p-3 rounded">
              <span>30-Year Total Salary</span>
              <span className="font-bold">{formatCurrency(earnings1.salary)}</span>
            </div>
            <div className="flex justify-between items-center bg-blue-50 p-3 rounded">
              <span>Pension Value (25yr)</span>
              <span className="font-bold">{formatCurrency(earnings1.pension)}</span>
            </div>
            <div className="flex justify-between items-center bg-yellow-50 p-3 rounded">
              <span>Housing Benefits</span>
              <span className="font-bold">{formatCurrency(housing1)}</span>
            </div>
            <div className="flex justify-between items-center bg-purple-50 p-3 rounded">
              <span>Medical Benefits</span>
              <span className="font-bold">{formatCurrency(medical1)}</span>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-100 to-emerald-100 p-4 rounded-lg border-l-4 border-green-600 mb-4">
            <p className="text-xs text-gray-600 mb-1">Total Lifetime Compensation</p>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalComp1)}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-white p-3 rounded text-center">
              <p className="text-gray-600">Difficulty</p>
              <p className="font-bold">{career1.difficulty}</p>
            </div>
            <div className="bg-white p-3 rounded text-center">
              <p className="text-gray-600">ROI</p>
              <p className="font-bold text-green-600">{roi1.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        {/* Path 2 */}
        <div className={`rounded-lg shadow-lg p-6 ${path2.includes('IAS') ? 'bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-300' : 'bg-white'}`}>
          <h3 className="text-2xl font-bold mb-4 text-gray-900">{career2.name}</h3>
          <p className="text-sm text-gray-600 mb-4">{career2.fullName}</p>

          <div className="space-y-3 mb-6 bg-white/50 p-4 rounded">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Entry Salary</span>
              <span className="font-bold text-lg text-green-600">{formatCurrency(career2.entrySalary * 12)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">At 10 years</span>
              <span className="font-bold text-lg">{formatCurrency(career2.salaryAt10 * 12)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">At 20 years</span>
              <span className="font-bold text-lg">{formatCurrency(career2.salaryAt20 * 12)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">At 30 years</span>
              <span className="font-bold text-lg">{formatCurrency(career2.salaryAt30 * 12)}</span>
            </div>
          </div>

          <div className="space-y-3 mb-6 text-sm">
            <div className="flex justify-between items-center bg-green-50 p-3 rounded">
              <span>30-Year Total Salary</span>
              <span className="font-bold">{formatCurrency(earnings2.salary)}</span>
            </div>
            <div className="flex justify-between items-center bg-blue-50 p-3 rounded">
              <span>Pension Value (25yr)</span>
              <span className="font-bold">{formatCurrency(earnings2.pension)}</span>
            </div>
            <div className="flex justify-between items-center bg-yellow-50 p-3 rounded">
              <span>Housing Benefits</span>
              <span className="font-bold">{formatCurrency(housing2)}</span>
            </div>
            <div className="flex justify-between items-center bg-purple-50 p-3 rounded">
              <span>Medical Benefits</span>
              <span className="font-bold">{formatCurrency(medical2)}</span>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-100 to-emerald-100 p-4 rounded-lg border-l-4 border-green-600 mb-4">
            <p className="text-xs text-gray-600 mb-1">Total Lifetime Compensation</p>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalComp2)}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-white p-3 rounded text-center">
              <p className="text-gray-600">Difficulty</p>
              <p className="font-bold">{career2.difficulty}</p>
            </div>
            <div className="bg-white p-3 rounded text-center">
              <p className="text-gray-600">ROI</p>
              <p className="font-bold text-green-600">{roi2.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Verdict */}
      <div className={`rounded-lg p-6 mb-8 text-white text-lg font-semibold ${
        totalComp1 > totalComp2 ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-blue-500 to-cyan-600'
      }`}>
        {totalComp1 > totalComp2
          ? `${path1} offers ${formatCurrency(totalComp1 - totalComp2)} more lifetime compensation`
          : `${path2} offers ${formatCurrency(totalComp2 - totalComp1)} more lifetime compensation`
        }
      </div>

      {/* Download Button */}
      <div className="flex justify-center">
        <button
          onClick={downloadComparison}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
        >
          <Download size={18} />
          Download Comparison
        </button>
      </div>
    </div>
  );
}
