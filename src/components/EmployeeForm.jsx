import { useEffect, useState } from "react";
import { Form, Input, Button, InputNumber, Divider, message } from "antd";
import { db, auth } from "../firebase/config";
import { doc, setDoc, updateDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";

export default function EmployeeForm({ data, close }) {
    const [form] = Form.useForm();

    const admin = JSON.parse(localStorage.getItem("worklog_user"));
    const orgId = admin?.orgId;

    // Preview calculated fields
    const [hourlyPay, setHourlyPay] = useState(0);
    const [minutePay, setMinutePay] = useState(0);

    // ---------------------------------------------------
    // LOAD DEFAULT OR EDIT MODE VALUES
    // ---------------------------------------------------
    useEffect(() => {
        if (data) {
            form.setFieldsValue({
                name: data.name,
                email: data.email,
                salaryBase: data.salaryBase,
                allowedLeavesPerMonth: data.allowedLeavesPerMonth ?? 4,
                shiftHoursPerDay: data.shiftHoursPerDay ?? 10,
            });

            calculateDerived(data.salaryBase);
        } else {
            form.setFieldsValue({
                name: "",
                email: "",
                salaryBase: 0,
                allowedLeavesPerMonth: 4,
                shiftHoursPerDay: 10,
            });

            calculateDerived(0);
        }
    }, [data]);

    // ---------------------------------------------------
    // CALCULATE HOURLY + MINUTE PAY
    // ---------------------------------------------------
    const calculateDerived = (salaryBase) => {
        const hourly = salaryBase / 300;
        const minute = hourly / 60;

        setHourlyPay(Number(hourly.toFixed(3)));
        setMinutePay(Number(minute.toFixed(4)));
    };

    // Run when salary changes
    const onSalaryChange = (value) => {
        calculateDerived(value || 0);
    };

    // ---------------------------------------------------
    // SAVE (CREATE or UPDATE)
    // ---------------------------------------------------
    const onFinish = async (values) => {
        try {
            const name = values.name.trim();
            const email = values.email.trim().toLowerCase();

            if (!name) return message.error("Name is required");
            if (!email) return message.error("Email is required");

            const payload = {
                name,
                email,
                role: "employee",
                orgId,
                salaryBase: Number(values.salaryBase || 0),
                allowedLeavesPerMonth: Number(values.allowedLeavesPerMonth || 0),
                shiftHoursPerDay: Number(values.shiftHoursPerDay || 0),
                hourlyPay: hourlyPay,
                minutePay: minutePay,
                updatedAt: new Date(),
            };

            // --------------------------
            // CREATE NEW EMPLOYEE
            // --------------------------
            if (!data) {
                if (!values.password)
                    return message.error("Password required for new employee");

                const userCred = await createUserWithEmailAndPassword(
                    auth,
                    email,
                    values.password
                );

                const uid = userCred.user.uid;

                await setDoc(doc(db, "users", uid), {
                    uid,
                    ...payload,
                    createdAt: new Date(),
                });

                message.success("Employee created successfully");
                return close();
            }

            // --------------------------
            // UPDATE EMPLOYEE
            // --------------------------
            const uid = data?.uid || data?.id;
            if (!uid) return message.error("Missing UID — cannot update employee");

            await updateDoc(doc(db, "users", uid), payload);

            message.success("Employee updated");
            close();

        } catch (err) {
            console.error(err);
            message.error("Error while saving employee");
        }
    };

    // ---------------------------------------------------
    // UI
    // ---------------------------------------------------
    return (
        <Form
            layout="vertical"
            form={form}
            onFinish={onFinish}
            style={{ paddingBottom: 20 }}
        >

            <Divider orientation="left" style={{ fontWeight: 700 }}>
                Employee Details
            </Divider>

            <div className="form-flex">

                <Form.Item name="name" label="Full Name" rules={[{ required: true }]}>
                    <Input placeholder="Employee Name" />
                </Form.Item>

                <Form.Item name="email" label="Email" rules={[{ required: true }]}>
                    <Input disabled={!!data} placeholder="example@mail.com" />
                </Form.Item>

                {!data && (
                    <Form.Item name="password" label="Password" rules={[{ required: true }]}>
                        <Input.Password placeholder="Create password" />
                    </Form.Item>
                )}

            </div>

            <Divider orientation="left" style={{ fontWeight: 700 }}>
                Salary & Work Info
            </Divider>

            <div className="form-flex">

                <Form.Item name="salaryBase" label="Base Salary (OMR)">
                    <InputNumber
                        min={0}
                        precision={3}
                        style={{ width: "100%" }}
                        onChange={onSalaryChange}
                    />
                </Form.Item>

                <Form.Item name="allowedLeavesPerMonth" label="Allowed Leaves Per Month">
                    <InputNumber min={0} max={31} style={{ width: "100%" }} />
                </Form.Item>

                <Form.Item name="shiftHoursPerDay" label="Required Daily Work Hours">
                    <InputNumber min={1} max={24} style={{ width: "100%" }} />
                </Form.Item>

            </div>

            {/* Derived Salary Preview */}
            <div style={{ marginTop: -10, marginBottom: 10 }}>
                <small style={{ color: "#888" }}>
                    Hourly Pay: <b>{hourlyPay} OMR</b>
                </small><br />
                <small style={{ color: "#888" }}>
                    Per Minute Pay: <b>{minutePay} OMR</b>
                </small>
            </div>

            <Button
                type="primary"
                block
                size="large"
                htmlType="submit"
                style={{ marginTop: 10 }}
            >
                {data ? "Update Employee" : "Create Employee"}
            </Button>

        </Form>
    );
}
