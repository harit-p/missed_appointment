import React, { useState, useEffect } from "react";
import axios from "axios";

const App = () => {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [availableSlots, setAvailableSlots] = useState([]);
  const [missedAppointments, setMissedAppointments] = useState([]);
  const [newSlot, setNewSlot] = useState("");
  const [appointmentId, setAppointmentId] = useState("");

  // Fetch doctors (Assumes static doctor IDs for simplicity)
  useEffect(() => {
    setDoctors([
      { id: "doc1", name: "Dr. Smith" },
      { id: "doc2", name: "Dr. Johnson" },
    ]);
  }, []);

  // Fetch available slots for the selected doctor
  const fetchAvailableSlots = async (doctorId) => {
    try {
      const response = await axios.get(`http://localhost:3030/api/slots/${doctorId}`);
      setAvailableSlots(response.data.availableSlots || []);
    } catch (error) {
      console.error("Error fetching slots:", error);
    }
  };

  // Fetch missed appointments
  const fetchMissedAppointments = async () => {
    try {
      const response = await axios.get(`http://localhost:3030/api/missedAppointments`);
      setMissedAppointments(response.data || []);
    } catch (error) {
      console.error("Error fetching missed appointments:", error);
    }
  };

  // Handle rebooking
  const handleRebooking = async () => {
    if (!appointmentId || !newSlot) {
      alert("Select an appointment and slot for rebooking!");
      return;
    }

    try {
      const response = await axios.post("http://localhost:3030/api/rebook", {
        appointmentId,
        newSlot,
      });
      alert(response.data.message);
      fetchMissedAppointments(); // Refresh missed appointments list
      fetchAvailableSlots(selectedDoctor); // Refresh slots
    } catch (error) {
      console.error("Error rebooking:", error);
      alert(error.response?.data?.message || "Error during rebooking.");
    }
  };

  // Handle doctor selection
  const handleDoctorChange = (doctorId) => {
    setSelectedDoctor(doctorId);
    fetchAvailableSlots(doctorId);
  };

  const styles = {
    container: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      fontFamily: "Arial, sans-serif",
      backgroundColor: "#f7f7f7",
      padding: "20px",
      textAlign: "center",
    },
    header: {
      marginBottom: "20px",
    },
    section: {
      marginBottom: "20px",
      width: "100%",
      maxWidth: "600px",
      background: "#ffffff",
      padding: "20px",
      borderRadius: "8px",
      boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
    },
    button: {
      marginLeft: "10px",
      padding: "10px 15px",
      borderRadius: "5px",
      border: "none",
      cursor: "pointer",
      backgroundColor: "#007BFF",
      color: "white",
      fontWeight: "bold",
    },
    select: {
      padding: "10px",
      margin: "10px 0",
      width: "100%",
    },
    list: {
      listStyle: "none",
      padding: 0,
    },
    listItem: {
      marginBottom: "10px",
    },
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>Appointment Management</h1>

      {/* Doctor Selection */}
      <div style={styles.section}>
        <label>
          Select Doctor:
          <select
            value={selectedDoctor}
            onChange={(e) => handleDoctorChange(e.target.value)}
            style={styles.select}
          >
            <option value="">--Select Doctor--</option>
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>
                {doctor.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Available Slots */}
      <div style={styles.section}>
        <h2>Available Slots</h2>
        {availableSlots.length ? (
          <ul style={styles.list}>
            {availableSlots.map((slot) => (
              <li key={slot} style={styles.listItem}>{new Date(slot).toLocaleString()}</li>
            ))}
          </ul>
        ) : (
          <p>No available slots for the selected doctor.</p>
        )}
      </div>

      {/* Missed Appointments */}
      <div style={styles.section}>
        <h2>Missed Appointments</h2>
        {missedAppointments.length ? (
          <ul style={styles.list}>
            {missedAppointments.map((appointment) => (
              <li key={appointment._id} style={styles.listItem}>
                Appointment with Doctor {appointment.doctorId} on {" "}
                {new Date(appointment.scheduledTime).toLocaleString()}
                <button
                  onClick={() => setAppointmentId(appointment._id)}
                  style={{
                    ...styles.button,
                    background: appointmentId === appointment._id ? "green" : "#007BFF",
                  }}
                >
                  Select
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p>No missed appointments found.</p>
        )}
      </div>

      {/* Rebooking Section */}
      <div style={styles.section}>
        <h2>Rebook Missed Appointment</h2>
        <label>
          Select New Slot:
          <select
            value={newSlot}
            onChange={(e) => setNewSlot(e.target.value)}
            style={styles.select}
            disabled={!availableSlots.length}
          >
            <option value="">--Select Slot--</option>
            {availableSlots.map((slot) => (
              <option key={slot} value={slot}>
                {new Date(slot).toLocaleString()}
              </option>
            ))}
          </select>
        </label>
        <button onClick={handleRebooking} style={styles.button}>
          Rebook
        </button>
      </div>
    </div>
  );
};

export default App;
