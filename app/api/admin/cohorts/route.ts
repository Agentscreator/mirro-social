import { NextRequest, NextResponse } from 'next/server';
import { cohortTracker } from '@/lib/cohortTracker';

/**
 * Admin API endpoint for cohort analysis
 * GET /api/admin/cohorts - Get cohort data and retention metrics
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'summary';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const userId = searchParams.get('userId');
    const days = searchParams.get('days');

    switch (action) {
      case 'calculate':
        const cohorts = await cohortTracker.calculateRetentionCohorts(
          startDate ? new Date(startDate) : undefined,
          endDate ? new Date(endDate) : undefined
        );
        return NextResponse.json({
          success: true,
          data: cohorts,
          message: 'Cohorts calculated successfully'
        });

      case 'summary':
        const summary = await cohortTracker.getCohortSummary();
        return NextResponse.json({
          success: true,
          data: summary,
          message: 'Cohort summary retrieved successfully'
        });

      case 'report':
        const report = await cohortTracker.generateRetentionReport();
        return NextResponse.json({
          success: true,
          data: report,
          message: 'Retention report generated successfully'
        });

      case 'churn':
        const churnDays = days ? parseInt(days) : 7;
        const churnUsers = await cohortTracker.getChurnRiskUsers(churnDays);
        return NextResponse.json({
          success: true,
          data: {
            churnRiskUsers,
            count: churnUsers.length,
            daysSinceLastActivity: churnDays
          },
          message: `Found ${churnUsers.length} users at churn risk`
        });

      case 'metrics':
        if (!userId) {
          return NextResponse.json({
            success: false,
            error: 'User ID is required for metrics'
          }, { status: 400 });
        }
        
        const metrics = await cohortTracker.getUserEngagementMetrics(userId);
        return NextResponse.json({
          success: true,
          data: metrics,
          message: 'User engagement metrics retrieved successfully'
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action parameter'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in cohorts API:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/admin/cohorts - Track user activity or trigger cohort calculation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, activityType, metadata } = body;

    switch (action) {
      case 'track':
        if (!userId || !activityType) {
          return NextResponse.json({
            success: false,
            error: 'userId and activityType are required'
          }, { status: 400 });
        }

        await cohortTracker.trackUserAction(userId, activityType, metadata);
        return NextResponse.json({
          success: true,
          message: 'Activity tracked successfully'
        });

      case 'recalculate':
        const { startDate, endDate } = body;
        const cohorts = await cohortTracker.calculateRetentionCohorts(
          startDate ? new Date(startDate) : undefined,
          endDate ? new Date(endDate) : undefined
        );
        
        return NextResponse.json({
          success: true,
          data: cohorts,
          message: 'Cohorts recalculated successfully'
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action parameter'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in cohorts POST API:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}