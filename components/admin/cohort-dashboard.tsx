'use client';

import React, { useState, useEffect } from 'react';

interface CohortData {
  cohortMonth: string;
  cohortSize: number;
  retentionRates: { [key: string]: number };
  activeUsers: { [key: string]: number };
}

interface RetentionReport {
  totalUsers: number;
  activeUsersLast30Days: number;
  churnRiskUsers: number;
  cohorts: CohortData[];
  generatedAt: string;
}

export default function CohortDashboard() {
  const [report, setReport] = useState<RetentionReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCohort, setSelectedCohort] = useState<CohortData | null>(null);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/cohorts?action=report');
      const result = await response.json();
      
      if (result.success) {
        setReport(result.data);
      } else {
        setError(result.error || 'Failed to fetch report');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const recalculateCohorts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/cohorts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'recalculate' })
      });
      
      const result = await response.json();
      
      if (result.success) {
        await fetchReport(); // Refresh the report
      } else {
        setError(result.error || 'Failed to recalculate cohorts');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();

  if (loading && !report) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading cohort data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-red-800 font-semibold">Error</h3>
        <p className="text-red-600">{error}</p>
        <button 
          onClick={fetchReport}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Retention Cohort Dashboard</h1>
        <div className="space-x-2">
          <button
            onClick={fetchReport}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <button
            onClick={recalculateCohorts}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Calculating...' : 'Recalculate'}
          </button>
        </div>
      </div>

      {report && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-lg shadow border">
              <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
              <p className="text-2xl font-bold text-gray-900">{report.totalUsers.toLocaleString()}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow border">
              <h3 className="text-sm font-medium text-gray-500">Active (30 days)</h3>
              <p className="text-2xl font-bold text-green-600">{report.activeUsersLast30Days.toLocaleString()}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow border">
              <h3 className="text-sm font-medium text-gray-500">Churn Risk</h3>
              <p className="text-2xl font-bold text-red-600">{report.churnRiskUsers.toLocaleString()}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow border">
              <h3 className="text-sm font-medium text-gray-500">Retention Rate</h3>
              <p className="text-2xl font-bold text-blue-600">
                {report.totalUsers > 0 
                  ? formatPercentage((report.activeUsersLast30Days / report.totalUsers) * 100)
                  : '0%'
                }
              </p>
            </div>
          </div>

          {/* Cohort Table */}
          <div className="bg-white rounded-lg shadow border">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Retention Cohorts</h2>
              <p className="text-sm text-gray-500">
                Last updated: {formatDate(report.generatedAt)}
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cohort Month
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Month 0
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Month 1
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Month 3
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Month 6
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Month 12
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {report.cohorts.slice(0, 12).map((cohort, index) => (
                    <tr 
                      key={cohort.cohortMonth}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedCohort(cohort)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {cohort.cohortMonth}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {cohort.cohortSize.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatPercentage(cohort.retentionRates.month_0 || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatPercentage(cohort.retentionRates.month_1 || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatPercentage(cohort.retentionRates.month_3 || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatPercentage(cohort.retentionRates.month_6 || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatPercentage(cohort.retentionRates.month_12 || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Selected Cohort Details */}
          {selectedCohort && (
            <div className="bg-white rounded-lg shadow border">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold">
                  Cohort Details: {selectedCohort.cohortMonth}
                </h2>
                <button
                  onClick={() => setSelectedCohort(null)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Close
                </button>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium mb-3">Retention Rates</h3>
                    <div className="space-y-2">
                      {Object.entries(selectedCohort.retentionRates).map(([month, rate]) => (
                        <div key={month} className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            {month.replace('_', ' ').replace('month', 'Month')}:
                          </span>
                          <span className="text-sm font-medium">
                            {formatPercentage(rate)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-3">Active Users</h3>
                    <div className="space-y-2">
                      {Object.entries(selectedCohort.activeUsers).map(([month, count]) => (
                        <div key={month} className="flex justify-between">
                          <span className="text-sm text-gray-600">
                            {month.replace('_', ' ').replace('month', 'Month')}:
                          </span>
                          <span className="text-sm font-medium">
                            {count.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}