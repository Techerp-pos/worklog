import { useState } from "react";
import { Button, message, Card, Popconfirm } from "antd";
import dayjs from "dayjs";
import { db } from "../firebase/config";
import { doc, setDoc, deleteDoc } from "firebase/firestore";

// THREE EMPLOYEES WITH THEIR RULES
const EMPLOYEES = [
    {
        uid: "EkIKAm35FmUrZRsjCZAbvsSnqMG2",
        name: "Omair",
        shiftHoursPerDay: 10,
        allowedLeaves: 4,
        actualLeaves: 3, // FULL allowed leaves taken
    },
    {
        uid: "ma7RRyHdWaT3kcEavcrN1c4cCF73",
        name: "Isaac",
        shiftHoursPerDay: 10,
        allowedLeaves: 4,
        actualLeaves: 1, // Took 3 leaves
    },
    {
        uid: "wjS3xNBKKegvmwElDqggMo8jvZS2",
        name: "Amar",
        shiftHoursPerDay: 10,
        allowedLeaves: 4,
        actualLeaves: 4, // Took 1 leave
    },
];

export default function FakeAttendanceGeneratorAll() {
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const generateFakeData = async () => {
        setLoading(true);

        try {
            const year = 2025;
            const month = 11; // November
            const totalDays = 30;

            for (const emp of EMPLOYEES) {
                const { uid, name, shiftHoursPerDay, actualLeaves } = emp;

                // RANDOM but fixed size leave selection
                const leaveDays = new Set();
                while (leaveDays.size < actualLeaves) {
                    leaveDays.add(Math.floor(Math.random() * totalDays) + 1);
                }

                let totalWorkedMinutes = 0;
                let totalOvertimeMinutes = 0;

                for (let day = 1; day <= totalDays; day++) {
                    const date = dayjs(`${year}-${month}-${day}`).format(
                        "YYYY-MM-DD"
                    );

                    // LEAVE DAY → no attendance record
                    if (leaveDays.has(day)) continue;

                    const checkIn = dayjs(`${date} 08:00`);
                    const checkOut = checkIn.add(shiftHoursPerDay, "hour");

                    const workedMinutes = shiftHoursPerDay * 60;

                    totalWorkedMinutes += workedMinutes;

                    await setDoc(doc(db, "attendance", uid, "days", date), {
                        uid,
                        employeeName: name,
                        date,
                        checkIn: checkIn.toDate(),
                        checkOut: checkOut.toDate(),
                        workedMinutes,
                        overtimeMinutes: 0,
                        overtimePay: 0,
                    });
                }

                await setDoc(
                    doc(db, "monthlySummary", uid, "months", "2025-11"),
                    {
                        uid,
                        month: "2025-11",
                        totalWorkedMinutes,
                        totalOvertimeMinutes,
                        createdAt: new Date(),
                    }
                );
            }

            message.success("Fake November data generated for all employees!");
        } catch (err) {
            console.error(err);
            message.error("Failed to generate data");
        }

        setLoading(false);
    };

    const deleteFakeData = async () => {
        setDeleting(true);

        try {
            for (const emp of EMPLOYEES) {
                const uid = emp.uid;

                // Delete all November days
                for (let day = 1; day <= 30; day++) {
                    const date = dayjs(`2025-11-${day}`).format("YYYY-MM-DD");

                    await deleteDoc(doc(db, "attendance", uid, "days", date));
                }

                // Delete summary
                await deleteDoc(
                    doc(db, "monthlySummary", uid, "months", "2025-11")
                );
            }

            message.success("Fake November data deleted for all employees!");
        } catch (err) {
            console.error(err);
            message.error("Failed to delete data");
        }

        setDeleting(false);
    };

    return (
        <Card style={{ maxWidth: 450, margin: "50px auto", textAlign: "center" }}>
            <h2>Fake Attendance Generator (November 2025)</h2>
            <p>Generates fake November attendance for 3 employees.</p>

            <Button
                type="primary"
                loading={loading}
                onClick={generateFakeData}
                block
                style={{ marginTop: 10 }}
            >
                Generate November Fake Data
            </Button>

            <Popconfirm
                title="Delete ALL fake November attendance for all 3 employees?"
                onConfirm={deleteFakeData}
            >
                <Button
                    danger
                    loading={deleting}
                    block
                    style={{ marginTop: 15 }}
                >
                    Delete November Fake Data
                </Button>
            </Popconfirm>
        </Card>
    );
}
