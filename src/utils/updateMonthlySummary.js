import { doc, getDoc, setDoc } from "firebase/firestore";
import dayjs from "dayjs";

export async function updateMonthlySummary(db, uid, dailyData) {
    const date = dayjs(dailyData.date);
    const monthKey = date.format("YYYY-MM");

    const monthRef = doc(db, "attendanceSummary", uid, "months", monthKey);
    const monthSnap = await getDoc(monthRef);

    const prev = monthSnap.exists() ? monthSnap.data() : {
        presentDays: 0,
        workedMinutes: 0,
        overtimeMinutes: 0,
        overtimePay: 0,
    };

    const updated = {
        presentDays: prev.presentDays + 1,
        workedMinutes: prev.workedMinutes + (dailyData.workedMinutes || 0),
        overtimeMinutes: prev.overtimeMinutes + (dailyData.overtimeMinutes || 0),
        overtimePay: Number((prev.overtimePay + (dailyData.overtimePay || 0)).toFixed(3)),
        updatedAt: new Date(),
        month: monthKey,
    };

    await setDoc(monthRef, updated);
}
