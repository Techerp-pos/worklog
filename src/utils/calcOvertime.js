// ----------------------------------------------------------
// Calculates overtime pay using slab rules
// slabs = [{ from, to, rate }]
// otMinutes = total overtime minutes (integer)
// ----------------------------------------------------------

export function calculateOvertimePay(otMinutes, slabs = []) {
    if (!otMinutes || otMinutes <= 0) return { overtimePay: 0 };

    let remaining = otMinutes;
    let totalPay = 0;

    // Sort slabs by duration (optional)
    slabs = [...slabs].sort((a, b) => a.from - b.from);

    while (remaining > 0) {
        let applied = false;

        for (const slab of slabs) {
            const duration = slab.to - slab.from;

            if (remaining >= duration) {
                const pay = (duration / 60) * slab.rate; // convert minutes → hours
                totalPay += pay;
                remaining -= duration;
                applied = true;
                break;
            }
        }

        // No slab matches → stop infinite loop
        if (!applied) break;
    }

    return { overtimePay: Number(totalPay.toFixed(3)) };
}
