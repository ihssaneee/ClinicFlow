import cors from 'cors';
import express from 'express';
import { HttpError } from './errors/http-error';
import { errorMiddleware } from './middleware/error.middleware';
import appointmentRoutes from './routes/appointment.routes';
import authRoutes from './routes/auth.routes';
import patientRoutes from './routes/patient.routes';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);

app.use((_req, _res, next) => {
  next(new HttpError(404, 'Introuvable.'));
});

app.use(errorMiddleware);

export default app;
