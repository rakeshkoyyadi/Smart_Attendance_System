import React from "react";

const Announcements = () => {

    const announcements = [
        {
            title: "Internal Examination",
            message: "Mid-1 examination timetable has been released."
        },
        {
            title: "Attendance Notice",
            message: "Students with attendance below 75% should contact faculty."
        },
        {
            title: "Placement Cell",
            message: "New company registration is available."
        }
    ];

    return (
        <div className="dashboard-card">

            <div className="announcement-header">

                <h3>
                    Announcements & Circulars
                </h3>

                <span>
                    {announcements.length} New
                </span>

            </div>

            {announcements.map((item, index) => (

                <div
                    className="announcement"
                    key={index}
                >

                    <strong>
                        {item.title}
                    </strong>

                    <p>
                        {item.message}
                    </p>

                </div>

            ))}

        </div>
    );
};

export default Announcements;