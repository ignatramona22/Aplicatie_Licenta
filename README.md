InspireU is a full-stack web application designed to facilitate online learning and course management. The platform allows users to access, create, and manage educational content, offering a personalized and interactive learning experience.

1. Tech Stack

Frontend: React.js + TypeScript, Redux Toolkit, Formik, Yup

Backend: Node.js + Express.js (MVC architecture, TypeScript)

Database: MongoDB + Mongoose

Other Tools: Socket.IO (real-time notifications), Stripe (payment integration), Redis (session caching), Nodemailer + EJS (email templates), Cloudinary (media storage), Chatbase (AI chatbot)

2. Main Features

Secure user authentication (OTP & social login with Google/GitHub via NextAuth.js)

Role-based access: Student, Instructor, Admin

Course management (create, edit, delete, preview, publish)

Stripe integration for secure online payments

Real-time notifications for purchases, comments, and reviews

Personalized study calendar and streak-based gamification system with rewards

AI chatbot assistant for user support

Responsive UI/UX, built with Figma prototypes

3. Architecture

The app follows a client-server architecture, with RESTful APIs for CRUD operations and WebSocket communication for live updates.
