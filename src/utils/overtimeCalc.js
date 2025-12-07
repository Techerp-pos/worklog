import dayjs from "dayjs";

// Calculate worked + overtime + slab pay
export function calculateAttendance(checkInTS, checkOutTS, employee) {
    const checkIn = dayjs(checkInTS.toDate());
    const checkOut = dayjs(checkOutTS.toDate());

    // Total minutes worked
    const workedMinutes = checkOut.diff(checkIn, "minute");

    // Employee working hours
    const start = dayjs(employee.workStartTime, "HH:mm");
    const end = dayjs(employee.workEndTime, "HH:mm");

    // Convert to same day as check-in
    const regularEnd = checkIn.hour(end.hour()).minute(end.minute());

    let overtimeMinutes = 0;

    if (checkOut.isAfter(regularEnd)) {
        overtimeMinutes = checkOut.diff(regularEnd, "minute");
    }

    // Apply salary slabs
    let overtimePay = 0;
    const slabsUsed = [];

    const slabs = (employee.overtimeSlabs || []).sort((a, b) => a.minutes - b.minutes);

    for (const slab of slabs) {
        const count = overtimeMinutes / slab.minutes;
        const pay = count * slab.amount;

        overtimePay += pay;

        slabsUsed.push({
            minutes: slab.minutes,
            amount: slab.amount,
            count: Number(count.toFixed(3)),
            pay: Number(pay.toFixed(3)),
        });
    }

    return {
        workedMinutes,
        overtimeMinutes,
        overtimePay: Number(overtimePay.toFixed(3)),
        slabsUsed,
    };
}
