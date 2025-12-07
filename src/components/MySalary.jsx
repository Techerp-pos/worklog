import { useEffect, useState } from "react";
import { db, auth } from "../firebase/config";
import { collection, query, where, getDocs } from "firebase/firestore";
import { DatePicker, Card } from "antd";
import dayjs from "dayjs";

const { MonthPicker } = DatePicker;

export default function MySalary() {
    const [month, setMonth] = useState(dayjs());
    const [salary, setSalary] = useState(null);

    const loadSalary = async () => {
        const uid = auth.currentUser.uid;

        const start = month.startOf("month").toDate();
        const end = month.endOf("month").toDate();

        const q = query(
            collection(db, "attendance"),
            where("uid", "==", uid),
            where("checkIn", ">=", start),
            where("checkIn", "<=", end)
        );

        const snap = await getDocs(q);

        let overtimePay = 0;
        snap.forEach((d) => {
            overtimePay += d.data().overtimePay || 0;
        });

        const userDoc = await getDocs(query(collection(db, "users"), where("uid", "==", uid)));
        const user = userDoc.docs[0].data();

        setSalary({
            base: user.salaryBase,
            overtime: Number(overtimePay.toFixed(3)),
            total: Number((user.salaryBase + overtimePay).toFixed(3)),
        });
    };

    useEffect(() => {
        loadSalary();
    }, [month]);

    return (
        <div>
            <MonthPicker value={month} onChange={setMonth} />

            {salary && (
                <Card style={{ marginTop: 20 }}>
                    <p><b>Base Salary:</b> {salary.base} OMR</p>
                    <p><b>Overtime:</b> {salary.overtime} OMR</p>
                    <p><b>Total Salary:</b> {salary.total} OMR</p>
                </Card>
            )}
        </div>
    );
}
