#!/usr/bin/env node

/**
 * Cohort Analysis CLI Tool
 * 
 * Usage:
 *   node scripts/cohort-analysis.js [command] [options]
 * 
 * Commands:
 *   calculate    - Calculate retention cohorts
 *   report       - Generate full retention report
 *   churn        - Get churn risk users
 *   metrics      - Get user engagement metrics
 *   track        - Track a user activity
 * 
 * Examples:
 *   node scripts/cohort-analysis.js calculate
 *   node scripts/cohort-analysis.js report
 *   node scripts/cohort-analysis.js churn --days 14
 *   node scripts/cohort-analysis.js metrics --user-id abc123
 *   node scripts/cohort-analysis.js track --user-id abc123 --action login
 */

const { cohortTracker } = require('../src/lib/cohortTracker');

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'calculate':
        console.log('🔄 Calculating retention cohorts...');
        const cohorts = await cohortTracker.calculateRetentionCohorts();
        console.log('✅ Cohort calculation complete!');
        console.table(cohorts.map(c => ({
          Month: c.cohortMonth,
          Size: c.cohortSize,
          'Month 0': `${c.retentionRates.month_0}%`,
          'Month 1': `${c.retentionRates.month_1}%`,
          'Month 3': `${c.retentionRates.month_3}%`,
          'Month 6': `${c.retentionRates.month_6}%`,
          'Month 12': `${c.retentionRates.month_12}%`
        })));
        break;

      case 'report':
        console.log('📊 Generating retention report...');
        const report = await cohortTracker.generateRetentionReport();
        console.log('✅ Report generated!');
        console.log('\n📈 RETENTION REPORT');
        console.log('==================');
        console.log(`Total Users: ${report.totalUsers}`);
        console.log(`Active Users (30 days): ${report.activeUsersLast30Days}`);
        console.log(`Churn Risk Users: ${report.churnRiskUsers}`);
        console.log(`Generated: ${report.generatedAt.toISOString()}`);
        console.log('\n📊 Cohort Summary:');
        console.table(report.cohorts.slice(0, 10)); // Show last 10 cohorts
        break;

      case 'churn':
        const daysArg = args.find(arg => arg.startsWith('--days='));
        const days = daysArg ? parseInt(daysArg.split('=')[1]) : 7;
        console.log(`🚨 Finding users at churn risk (${days} days inactive)...`);
        const churnUsers = await cohortTracker.getChurnRiskUsers(days);
        console.log(`Found ${churnUsers.length} users at risk of churning`);
        if (churnUsers.length > 0) {
          console.log('User IDs:', churnUsers.slice(0, 10).join(', '));
          if (churnUsers.length > 10) {
            console.log(`... and ${churnUsers.length - 10} more`);
          }
        }
        break;

      case 'metrics':
        const userIdArg = args.find(arg => arg.startsWith('--user-id='));
        if (!userIdArg) {
          console.error('❌ Please provide --user-id=<user-id>');
          process.exit(1);
        }
        const userId = userIdArg.split('=')[1];
        console.log(`📊 Getting engagement metrics for user: ${userId}`);
        const metrics = await cohortTracker.getUserEngagementMetrics(userId);
        console.log('✅ Metrics retrieved!');
        console.table([{
          'User ID': metrics.userId,
          'Last Active': metrics.lastActiveDate.toISOString().split('T')[0],
          'Posts': metrics.totalPosts,
          'Likes': metrics.totalLikes,
          'Comments': metrics.totalComments,
          'Messages': metrics.totalMessages,
          'Story Views': metrics.totalStoryViews,
          'Follows': metrics.totalFollows,
          'Profile Visits': metrics.totalProfileVisits,
          'Engagement Score': metrics.engagementScore
        }]);
        break;

      case 'track':
        const trackUserIdArg = args.find(arg => arg.startsWith('--user-id='));
        const actionArg = args.find(arg => arg.startsWith('--action='));
        
        if (!trackUserIdArg || !actionArg) {
          console.error('❌ Please provide --user-id=<user-id> and --action=<action>');
          console.log('Available actions: login, post_created, post_liked, comment_made, message_sent, story_viewed, profile_visited, follow_made, app_opened, feed_scrolled, search_performed');
          process.exit(1);
        }
        
        const trackUserId = trackUserIdArg.split('=')[1];
        const action = actionArg.split('=')[1];
        
        console.log(`📝 Tracking activity: ${action} for user: ${trackUserId}`);
        await cohortTracker.trackUserAction(trackUserId, action);
        console.log('✅ Activity tracked!');
        break;

      case 'summary':
        console.log('📋 Getting cohort summary...');
        const summary = await cohortTracker.getCohortSummary();
        console.log('✅ Summary retrieved!');
        console.table(summary.slice(0, 12).map(s => ({
          Month: s.cohortMonth,
          Size: s.cohortSize,
          'Month 1': s.retentionRates?.month_1 ? `${s.retentionRates.month_1}%` : 'N/A',
          'Month 3': s.retentionRates?.month_3 ? `${s.retentionRates.month_3}%` : 'N/A',
          'Month 6': s.retentionRates?.month_6 ? `${s.retentionRates.month_6}%` : 'N/A',
          'Calculated': s.calculatedAt ? new Date(s.calculatedAt).toISOString().split('T')[0] : 'N/A'
        })));
        break;

      default:
        console.log('🔧 Cohort Analysis Tool');
        console.log('=======================');
        console.log('Available commands:');
        console.log('  calculate  - Calculate retention cohorts');
        console.log('  report     - Generate full retention report');
        console.log('  churn      - Get churn risk users (--days=N)');
        console.log('  metrics    - Get user engagement metrics (--user-id=ID)');
        console.log('  track      - Track user activity (--user-id=ID --action=ACTION)');
        console.log('  summary    - Get cohort summary');
        console.log('\nExamples:');
        console.log('  node scripts/cohort-analysis.js calculate');
        console.log('  node scripts/cohort-analysis.js churn --days=14');
        console.log('  node scripts/cohort-analysis.js metrics --user-id=abc123');
        console.log('  node scripts/cohort-analysis.js track --user-id=abc123 --action=login');
        break;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}