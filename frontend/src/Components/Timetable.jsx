import React from "react";

const Timetable = () => {

    const timetable = [
        {
            time: "09:00 AM",
            subject: "Artificial Intelligence",
            room: "Room 204"
        },
        {
            time: "10:30 AM",
            subject: "Machine Learning",
            room: "Room 204"
        },
        {
            time: "12:00 PM",
            subject: "Web Technology",
            room: "Room 301"
        },
        {
            time: "02:00 PM",
            subject: "AR / VR",
            room: "VR Lab"
        }
    ];

    return (
        <div className="dashboard-card">

            <h3>Today's Timetable</h3>

            {timetable.map((item, index) => (

                <div
                    className="timetable-row"
                    key={index}
                >

                    <div>
                        <strong>
                            {item.time}
                        </strong>

                        <p>
                            {item.subject}
                        </p>
                    </div>

                    <span>
                        {item.room}
                    </span>

                </div>

            ))}

        </div>
    );
};

export default Timetable;