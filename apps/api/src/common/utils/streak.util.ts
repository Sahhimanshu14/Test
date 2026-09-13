/**
 * Authoritative Server-Side Streak Calculation Utility
 *
 * Prevents client-side manipulation of daily streaks by deriving
 * continuity purely from calendar date differences.
 */

export interface StreakUpdateResult {
  currentStreak: number;
  highestStreak: number;
  lastActiveDate: Date;
  streakIncreased: boolean;
  isActiveToday: boolean;
}

export function calculateStreakUpdate(
  currentStreak: number,
  highestStreak: number,
  lastActiveDate: Date | null,
  referenceDate: Date = new Date(),
): StreakUpdateResult {
  const todayStr = referenceDate.toISOString().slice(0, 10);
  const todayDate = new Date(todayStr);

  if (!lastActiveDate) {
    return {
      currentStreak: 1,
      highestStreak: Math.max(highestStreak, 1),
      lastActiveDate: todayDate,
      streakIncreased: true,
      isActiveToday: true,
    };
  }

  const lastActiveStr = lastActiveDate.toISOString().slice(0, 10);

  if (lastActiveStr === todayStr) {
    // Activity already recorded for today; maintain streak
    return {
      currentStreak,
      highestStreak,
      lastActiveDate,
      streakIncreased: false,
      isActiveToday: true,
    };
  }

  const lastActive = new Date(lastActiveStr);
  const diffTime = todayDate.getTime() - lastActive.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) {
    // Consecutive day activity: increment streak
    const newStreak = currentStreak + 1;
    return {
      currentStreak: newStreak,
      highestStreak: Math.max(highestStreak, newStreak),
      lastActiveDate: todayDate,
      streakIncreased: true,
      isActiveToday: true,
    };
  } else if (diffDays > 1) {
    // Streak broken: reset to 1
    return {
      currentStreak: 1,
      highestStreak: Math.max(highestStreak, 1),
      lastActiveDate: todayDate,
      streakIncreased: true,
      isActiveToday: true,
    };
  } else {
    // Clock skew or past date: retain current status
    return {
      currentStreak,
      highestStreak,
      lastActiveDate,
      streakIncreased: false,
      isActiveToday: false,
    };
  }
}

export function evaluateActiveStreak(
  currentStreak: number,
  lastActiveDate: Date | null,
  referenceDate: Date = new Date(),
): { currentStreak: number; isActiveToday: boolean; isStreakBroken: boolean } {
  if (!lastActiveDate || currentStreak === 0) {
    return { currentStreak: 0, isActiveToday: false, isStreakBroken: false };
  }

  const todayStr = referenceDate.toISOString().slice(0, 10);
  const lastActiveStr = lastActiveDate.toISOString().slice(0, 10);

  if (todayStr === lastActiveStr) {
    return { currentStreak, isActiveToday: true, isStreakBroken: false };
  }

  const todayDate = new Date(todayStr);
  const lastActive = new Date(lastActiveStr);
  const diffDays = Math.round((todayDate.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 1) {
    // Yesterday was active; streak is pending today's activity
    return { currentStreak, isActiveToday: false, isStreakBroken: false };
  }

  // More than 1 day has elapsed without activity: streak broken
  return { currentStreak: 0, isActiveToday: false, isStreakBroken: true };
}
