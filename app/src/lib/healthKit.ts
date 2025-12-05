/**
 * HealthKit (iOS) / Google Fit (Android) Integration
 *
 * Provides unified interface to read health data from device
 */

import { Platform } from "react-native";
import AppleHealthKit, {
  HealthKitPermissions,
  HealthValue,
  HealthInputOptions,
} from "react-native-health";
import GoogleFit, { Scopes, BucketUnit } from "react-native-google-fit";

// Types
export interface HealthData {
  steps: number;
  distance: number; // in meters
  activeCalories: number;
  exerciseMinutes: number;
  sleepHours: number;
  heartRate?: number;
  waterIntake?: number; // in ml
}

export interface HealthPermissions {
  steps: boolean;
  distance: boolean;
  calories: boolean;
  exercise: boolean;
  sleep: boolean;
  heartRate: boolean;
  water: boolean;
}

export type HealthDataType =
  | "steps"
  | "distance"
  | "activeCalories"
  | "exerciseMinutes"
  | "sleepHours"
  | "heartRate"
  | "water";

// HealthKit permissions for iOS
const healthKitPermissions: HealthKitPermissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.Steps,
      AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
      AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
      AppleHealthKit.Constants.Permissions.AppleExerciseTime,
      AppleHealthKit.Constants.Permissions.SleepAnalysis,
      AppleHealthKit.Constants.Permissions.HeartRate,
      AppleHealthKit.Constants.Permissions.Water,
    ],
    write: [],
  },
};

// Google Fit options for Android
const googleFitOptions = {
  scopes: [
    Scopes.FITNESS_ACTIVITY_READ,
    Scopes.FITNESS_BODY_READ,
    Scopes.FITNESS_LOCATION_READ,
  ],
};

// Check if health data is available on this device
export const isHealthDataAvailable = async (): Promise<boolean> => {
  try {
    if (Platform.OS === "ios") {
      return new Promise((resolve) => {
        AppleHealthKit.isAvailable((err, available) => {
          resolve(!err && available);
        });
      });
    } else if (Platform.OS === "android") {
      return new Promise((resolve) => {
        GoogleFit.checkIsAuthorized()
          .then(() => {
            resolve(GoogleFit.isAuthorized);
          })
          .catch(() => resolve(false));
      });
    }
    return false;
  } catch (error) {
    console.error("Error checking health availability:", error);
    return false;
  }
};

// Request permissions from user
export const requestHealthPermissions =
  async (): Promise<HealthPermissions> => {
    const defaultPermissions: HealthPermissions = {
      steps: false,
      distance: false,
      calories: false,
      exercise: false,
      sleep: false,
      heartRate: false,
      water: false,
    };

    try {
      if (Platform.OS === "ios") {
        return new Promise((resolve) => {
          AppleHealthKit.initHealthKit(healthKitPermissions, (error) => {
            if (error) {
              console.error("HealthKit permission denied:", error);
              resolve(defaultPermissions);
            } else {
              resolve({
                steps: true,
                distance: true,
                calories: true,
                exercise: true,
                sleep: true,
                heartRate: true,
                water: true,
              });
            }
          });
        });
      } else if (Platform.OS === "android") {
        const authResult = await GoogleFit.authorize(googleFitOptions);
        if (authResult.success) {
          return {
            steps: true,
            distance: true,
            calories: true,
            exercise: true,
            sleep: true,
            heartRate: true,
            water: true,
          };
        }
        return defaultPermissions;
      }

      return defaultPermissions;
    } catch (error) {
      console.error("Error requesting health permissions:", error);
      return defaultPermissions;
    }
  };

// Helper function to get sleep data on iOS
const getSleepDataiOS = async (startOfDay: Date): Promise<number> => {
  return new Promise((resolve) => {
    const options: HealthInputOptions = {
      startDate: new Date(
        startOfDay.getTime() - 24 * 60 * 60 * 1000
      ).toISOString(),
      endDate: startOfDay.toISOString(),
    };

    AppleHealthKit.getSleepSamples(options, (err, results: any[]) => {
      if (err || !results || results.length === 0) {
        resolve(0);
        return;
      }

      let totalMinutes = 0;
      for (const sample of results) {
        if (sample.value === "ASLEEP" || sample.value === "INBED") {
          const start = new Date(sample.startDate);
          const end = new Date(sample.endDate);
          const minutes = (end.getTime() - start.getTime()) / (1000 * 60);
          totalMinutes += minutes;
        }
      }

      resolve(Math.round((totalMinutes / 60) * 10) / 10);
    });
  });
};

// Get today's health data
export const getTodayHealthData = async (): Promise<HealthData> => {
  const defaultData: HealthData = {
    steps: 0,
    distance: 0,
    activeCalories: 0,
    exerciseMinutes: 0,
    sleepHours: 0,
  };

  try {
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    if (Platform.OS === "ios") {
      const options: HealthInputOptions = {
        startDate: startOfDay.toISOString(),
        endDate: today.toISOString(),
      };

      const steps = await new Promise<number>((resolve) => {
        AppleHealthKit.getStepCount(options, (err, results: HealthValue) => {
          resolve(err ? 0 : results?.value || 0);
        });
      });

      const distance = await new Promise<number>((resolve) => {
        AppleHealthKit.getDistanceWalkingRunning(
          options,
          (err, results: HealthValue) => {
            resolve(err ? 0 : (results?.value || 0) * 1000);
          }
        );
      });

      const calories = await new Promise<number>((resolve) => {
        AppleHealthKit.getActiveEnergyBurned(options, (err, results: any[]) => {
          if (err || !results) {
            resolve(0);
          } else {
            const total = results.reduce((sum, r) => sum + (r.value || 0), 0);
            resolve(Math.round(total));
          }
        });
      });

      const exercise = await new Promise<number>((resolve) => {
        AppleHealthKit.getAppleExerciseTime(options, (err, results: any[]) => {
          if (err || !results) {
            resolve(0);
          } else {
            const total = results.reduce((sum, r) => sum + (r.value || 0), 0);
            resolve(Math.round(total));
          }
        });
      });

      const sleep = await getSleepDataiOS(startOfDay);

      return {
        steps: Math.round(steps),
        distance: Math.round(distance),
        activeCalories: calories,
        exerciseMinutes: exercise,
        sleepHours: sleep,
      };
    } else if (Platform.OS === "android") {
      const opt = {
        startDate: startOfDay.toISOString(),
        endDate: today.toISOString(),
        bucketUnit: BucketUnit.DAY,
        bucketInterval: 1,
      };

      const stepsData = await GoogleFit.getDailyStepCountSamples(opt);
      let steps = 0;
      if (stepsData && stepsData.length > 0) {
        for (const source of stepsData) {
          if (source.steps && source.steps.length > 0) {
            steps = source.steps[0]?.value || 0;
            break;
          }
        }
      }

      const distanceData = await GoogleFit.getDailyDistanceSamples(opt);
      const distance =
        distanceData && distanceData.length > 0
          ? distanceData[0]?.distance || 0
          : 0;

      const caloriesData = await GoogleFit.getDailyCalorieSamples(opt);
      const calories =
        caloriesData && caloriesData.length > 0
          ? caloriesData[0]?.calorie || 0
          : 0;

      return {
        steps: Math.round(steps),
        distance: Math.round(distance),
        activeCalories: Math.round(calories),
        exerciseMinutes: 0,
        sleepHours: 0,
      };
    }

    return defaultData;
  } catch (error) {
    console.error("Error getting health data:", error);
    return defaultData;
  }
};

// Get health data for a specific date range
export const getHealthDataForRange = async (
  startDate: Date,
  endDate: Date
): Promise<HealthData[]> => {
  try {
    const data: HealthData[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      if (Platform.OS === "ios") {
        const options: HealthInputOptions = {
          startDate: dayStart.toISOString(),
          endDate: dayEnd.toISOString(),
        };

        const steps = await new Promise<number>((resolve) => {
          AppleHealthKit.getStepCount(options, (err, results: HealthValue) => {
            resolve(err ? 0 : results?.value || 0);
          });
        });

        data.push({
          steps: Math.round(steps),
          distance: 0,
          activeCalories: 0,
          exerciseMinutes: 0,
          sleepHours: 0,
        });
      } else {
        data.push({
          steps: 0,
          distance: 0,
          activeCalories: 0,
          exerciseMinutes: 0,
          sleepHours: 0,
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return data;
  } catch (error) {
    console.error("Error getting health data range:", error);
    return [];
  }
};

// Get weekly summary
export const getWeeklyHealthSummary = async (): Promise<{
  totalSteps: number;
  avgSteps: number;
  totalDistance: number;
  totalCalories: number;
  totalExerciseMinutes: number;
  avgSleepHours: number;
}> => {
  try {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    if (Platform.OS === "ios") {
      const options: HealthInputOptions = {
        startDate: weekAgo.toISOString(),
        endDate: today.toISOString(),
      };

      const steps = await new Promise<number>((resolve) => {
        AppleHealthKit.getStepCount(options, (err, results: HealthValue) => {
          resolve(err ? 0 : results?.value || 0);
        });
      });

      const distance = await new Promise<number>((resolve) => {
        AppleHealthKit.getDistanceWalkingRunning(
          options,
          (err, results: HealthValue) => {
            resolve(err ? 0 : (results?.value || 0) * 1000);
          }
        );
      });

      const calories = await new Promise<number>((resolve) => {
        AppleHealthKit.getActiveEnergyBurned(options, (err, results: any[]) => {
          if (err || !results) resolve(0);
          else resolve(results.reduce((sum, r) => sum + (r.value || 0), 0));
        });
      });

      const exercise = await new Promise<number>((resolve) => {
        AppleHealthKit.getAppleExerciseTime(options, (err, results: any[]) => {
          if (err || !results) resolve(0);
          else resolve(results.reduce((sum, r) => sum + (r.value || 0), 0));
        });
      });

      return {
        totalSteps: Math.round(steps),
        avgSteps: Math.round(steps / 7),
        totalDistance: Math.round(distance),
        totalCalories: Math.round(calories),
        totalExerciseMinutes: Math.round(exercise),
        avgSleepHours: 0,
      };
    } else if (Platform.OS === "android") {
      const opt = {
        startDate: weekAgo.toISOString(),
        endDate: today.toISOString(),
        bucketUnit: BucketUnit.DAY,
        bucketInterval: 1,
      };

      const stepsData = await GoogleFit.getDailyStepCountSamples(opt);
      let totalSteps = 0;
      if (stepsData && stepsData.length > 0) {
        for (const source of stepsData) {
          if (source.steps) {
            totalSteps = source.steps.reduce(
              (sum: number, s: any) => sum + (s.value || 0),
              0
            );
            if (totalSteps > 0) break;
          }
        }
      }

      return {
        totalSteps,
        avgSteps: Math.round(totalSteps / 7),
        totalDistance: 0,
        totalCalories: 0,
        totalExerciseMinutes: 0,
        avgSleepHours: 0,
      };
    }

    return {
      totalSteps: 0,
      avgSteps: 0,
      totalDistance: 0,
      totalCalories: 0,
      totalExerciseMinutes: 0,
      avgSleepHours: 0,
    };
  } catch (error) {
    console.error("Error getting weekly health summary:", error);
    return {
      totalSteps: 0,
      avgSteps: 0,
      totalDistance: 0,
      totalCalories: 0,
      totalExerciseMinutes: 0,
      avgSleepHours: 0,
    };
  }
};

// Verify a quest/habit completion against health data
export const verifyQuestWithHealthData = async (
  questType: string,
  targetValue: number
): Promise<{
  verified: boolean;
  actualValue: number;
  message: string;
}> => {
  const healthData = await getTodayHealthData();

  switch (questType) {
    case "steps":
      return {
        verified: healthData.steps >= targetValue,
        actualValue: healthData.steps,
        message:
          healthData.steps >= targetValue
            ? `✅ Verified: ${healthData.steps.toLocaleString()} steps`
            : `❌ Not yet: ${healthData.steps.toLocaleString()}/${targetValue.toLocaleString()} steps`,
      };

    case "distance":
      const distanceKm = healthData.distance / 1000;
      return {
        verified: distanceKm >= targetValue,
        actualValue: distanceKm,
        message:
          distanceKm >= targetValue
            ? `✅ Verified: ${distanceKm.toFixed(1)} km`
            : `❌ Not yet: ${distanceKm.toFixed(1)}/${targetValue} km`,
      };

    case "exercise":
      return {
        verified: healthData.exerciseMinutes >= targetValue,
        actualValue: healthData.exerciseMinutes,
        message:
          healthData.exerciseMinutes >= targetValue
            ? `✅ Verified: ${healthData.exerciseMinutes} minutes`
            : `❌ Not yet: ${healthData.exerciseMinutes}/${targetValue} minutes`,
      };

    case "calories":
      return {
        verified: healthData.activeCalories >= targetValue,
        actualValue: healthData.activeCalories,
        message:
          healthData.activeCalories >= targetValue
            ? `✅ Verified: ${healthData.activeCalories} cal`
            : `❌ Not yet: ${healthData.activeCalories}/${targetValue} cal`,
      };

    case "sleep":
      return {
        verified: healthData.sleepHours >= targetValue,
        actualValue: healthData.sleepHours,
        message:
          healthData.sleepHours >= targetValue
            ? `✅ Verified: ${healthData.sleepHours} hours`
            : `❌ Not yet: ${healthData.sleepHours}/${targetValue} hours`,
      };

    default:
      return {
        verified: false,
        actualValue: 0,
        message: "Quest type not supported for health verification",
      };
  }
};

// Sync health data to Supabase for analytics
export const syncHealthDataToSupabase = async (
  userId: string,
  supabase: any
): Promise<boolean> => {
  try {
    const healthData = await getTodayHealthData();
    const today = new Date().toISOString().split("T")[0];

    const { error } = await supabase.from("health_data_logs").upsert(
      {
        user_id: userId,
        date: today,
        steps: healthData.steps,
        distance_meters: healthData.distance,
        active_calories: healthData.activeCalories,
        exercise_minutes: healthData.exerciseMinutes,
        sleep_hours: healthData.sleepHours,
        synced_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,date",
      }
    );

    if (error) {
      console.error("Error syncing health data:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error syncing health data:", error);
    return false;
  }
};

export default {
  isHealthDataAvailable,
  requestHealthPermissions,
  getTodayHealthData,
  getHealthDataForRange,
  getWeeklyHealthSummary,
  verifyQuestWithHealthData,
  syncHealthDataToSupabase,
};
