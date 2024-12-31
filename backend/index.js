const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const cors = require('cors'); // Import the CORS middleware

// Initialize App and Middleware
const app = express();
app.use(bodyParser.json());
app.use(cors()); // Enable CORS for all routes

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/appointment_system');

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
    console.log('Connected to MongoDB');
});

// Schemas and Models
const AppointmentSchema = new mongoose.Schema({
    patientId: String,
    doctorId: String,
    scheduledTime: Date,
    status: { type: String, default: 'scheduled' },
    notificationSent: { type: Boolean, default: false },
});

const DoctorScheduleSchema = new mongoose.Schema({
    doctorId: String,
    availableSlots: [Date],
});

const Appointment = mongoose.model('Appointment', AppointmentSchema);
const DoctorSchedule = mongoose.model('DoctorSchedule', DoctorScheduleSchema);

// Grace Period (15 minutes check)
const GRACE_PERIOD = 15 * 60 * 1000;

// Utilities
const sendEmail = async (email, subject, text) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: '',
            pass: '',
        },
    });

    try {
        await transporter.sendMail({ from: '', to: email, subject, text });
        console.log(`Email sent to: ${email}`);
        return { status: 'success', message: 'Email sent successfully' };
    } catch (error) {
        console.error('Error sending email:', error);
        return { status: 'failure', message: 'Failed to send email' };
    }
};

const sendSMS = async (phoneNumber, message) => {
    const client = twilio('', '');

    try {
        await client.messages.create({
            body: message,
            from: '',
            to: phoneNumber,
        });
        console.log(`SMS sent to: ${phoneNumber}`);
        return { status: 'success', message: 'SMS sent successfully' };
    } catch (error) {
        console.error('Error sending SMS:', error);
        return { status: 'failure', message: 'Failed to send SMS' };
    }
};

// Detect No-Shows
setInterval(async () => {
    const now = new Date();
    const missedAppointments = await Appointment.find({
        status: 'scheduled',
        scheduledTime: { $lt: new Date(now - GRACE_PERIOD) },
    });

    for (const appointment of missedAppointments) {
        appointment.status = 'missed';
        await appointment.save();

        // Notify Patient
        const rescheduleOptions = await DoctorSchedule.findOne({ doctorId: appointment.doctorId });
        if (rescheduleOptions && rescheduleOptions.availableSlots.length > 0) {
            const message = `Your appointment was missed. Available slots: ${rescheduleOptions.availableSlots.join(', ')}`;
            // Replace with actual patient email/phone retrieval logic
            await sendEmail('', 'Missed Appointment', message);
            await sendSMS('', message);
        }
    }
}, 60000); // Runs every minute

// Slot Finder API
app.get('/api/slots/:doctorId', async (req, res) => {
    const { doctorId } = req.params;
    const schedule = await DoctorSchedule.findOne({ doctorId });

    if (!schedule) {
        return res.status(404).json({ message: 'No schedule found for this doctor' });
    }

    res.json({ availableSlots: schedule.availableSlots });
});

// Rebooking Management API
app.post('/api/rebook', async (req, res) => {
    const { appointmentId, newSlot } = req.body;
    const appointment = await Appointment.findById(appointmentId);

    if (!appointment || appointment.status !== 'missed') {
        return res.status(400).json({ message: 'Invalid or non-missed appointment' });
    }

    const doctorSchedule = await DoctorSchedule.findOne({ doctorId: appointment.doctorId });
    if (!doctorSchedule.availableSlots.includes(newSlot)) {
        return res.status(400).json({ message: 'Slot not available' });
    }

    appointment.scheduledTime = new Date(newSlot);
    appointment.status = 'scheduled';
    await appointment.save();

    // Update Doctor Schedule
    doctorSchedule.availableSlots = doctorSchedule.availableSlots.filter(slot => slot !== newSlot);
    await doctorSchedule.save();

    res.json({ message: 'Appointment rescheduled successfully', appointment });
});

// API to fetch missed appointments for a specific patient
app.get('/api/missedAppointments/:patientId', async (req, res) => {
    const { patientId } = req.params;
    try {
        const missedAppointments = await Appointment.find({
            patientId,
            status: 'missed',
        });

        if (missedAppointments.length === 0) {
            return res.status(404).json({ message: 'No missed appointments found for this patient' });
        }

        res.json({ missedAppointments });
    } catch (error) {
        console.error('Error fetching missed appointments:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Test API to send email and SMS (for testing purposes)
app.post('/api/test-notification', async (req, res) => {
    const { email, phoneNumber, message } = req.body;

    try {
        const emailResponse = await sendEmail(email, 'Test Subject', message);
        const smsResponse = await sendSMS(phoneNumber, message);

        res.json({
            emailResponse,
            smsResponse,
            message: 'Test notifications sent',
        });
    } catch (error) {
        res.status(500).json({ message: 'Error sending notifications', error });
    }
});

// Start Server
const PORT = 3030;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
