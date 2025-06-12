<div align="center">

# 🎬 ScriptGlance

*Collaborative teleprompter platform for presentations*

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Socket.io](https://img.shields.io/badge/Socket.io-black?style=for-the-badge&logo=socket.io&badgeColor=010101)](https://socket.io/)

---

**ScriptGlance** is a modern React-based web application that provides an intuitive interface for collaborative video presentations with advanced teleprompter functionality, real-time editing, and seamless user experience.

</div>

---
<div align="center">
<table>
<tr>
<td width="50%" valign="top">

### 🔐 **Authentication & User Management**
- 🔑 JWT-based secure authentication  
- 👤 User profile management  
- 🔄 Password reset functionality  
- 📧 Email verification flow  

### 📋 **Presentation Management**
- ➕ Create and organize presentations  
- ✏️ Real-time collaborative text editing  
- 🎯 Drag-and-drop presentation structure  
- 👥 Participant management interface  
- 📊 Presentation analytics dashboard  

### 📺 **Advanced Teleprompter System**
- 🎥 Professional teleprompter interface
- 🎯 Real-time reading position tracking
- 👑 Dynamic ownership management
- 🔄 Seamless part transitions
- ⏰ Reading confirmation system
- 🔔 Visual notifications and alerts
- 🎬 Video recording integration

</td>
<td width="50%" valign="top">

### 🎥 **Video & Media Features**
- 📤 Recorded video uploading 
- 🎬 Custom video player component  
- 🖼️ Video preview generation  
- 🔗 Shared video functionality  
- 📱 Responsive media controls  

### 💬 **Real-time Communication**
- 🔌 WebSocket integration with Socket.IO  
- 💭 Live chat functionality  
- 🔔 Real-time notifications  
- 👥 User presence indicators  
- ✏️ Collaborative text editing synchronization  

### 🎨 **User Experience**
- 🎯 Modern, intuitive interface  
- 🌙 Clean component architecture  
- 🎪 Smooth animations and transitions  

### ⚙️ **Admin & Moderator **
- 👤 Admin dashboard interface  
- 📨 Invitation management system  
- 🛡️ Moderator chats system
- 📈 Analytics visualization with Chart.js

</td>
</tr>
</table>
</div>

---

## 🛠️ Tech Stack

<div align="center">

| Category | Technologies |
|----------|-------------|
| **Framework** | ![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black) ![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white) |
| **Language** | ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white) |
| **State Management** | ![React Router](https://img.shields.io/badge/React_Router-CA4245?style=flat-square&logo=react-router&logoColor=white) |
| **Real-time** | ![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=flat-square&logo=socket.io&logoColor=white) |
| **HTTP Client** | ![Axios](https://img.shields.io/badge/Axios-5A29E4?style=flat-square&logo=axios&logoColor=white) |
| **Data Visualization** | ![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?style=flat-square&logo=chart.js&logoColor=white) |
| **Authentication** | ![JWT](https://img.shields.io/badge/JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white) |
| **Drag & Drop** | Hello Pangea DnD |
| **Storage** | IndexedDB (IDB) |

</div>

---

## 📋 Prerequisites

<div align="center">

| Requirement | Version | Status |
|-------------|---------|--------|
| ![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white) | 18+ | ✅ Required |
| ![npm](https://img.shields.io/badge/npm-CB3837?style=flat-square&logo=npm&logoColor=white) | Latest | ✅ Required |
| ![Git](https://img.shields.io/badge/Git-F05032?style=flat-square&logo=git&logoColor=white) | Latest | ✅ Required |

</div>

---

## 🚀 Quick Start

### 📥 Installation

```bash
# Clone the repository
git clone https://github.com/ScriptGlance/frontend.git
cd frontend

# Install dependencies
npm install

# Create the environment file
touch .env
# Edit .env with your configuration (see the example configuration below)
```

### ⚙️ Environment Configuration

Create a `.env` file in the root directory:

<details>
<summary>📄 Click to expand environment variables</summary>

```env
# Application Settings
VITE_APP_API_BASE_URL=http://localhost:3000
VITE_APP_FRONTEND_URL=http://localhost:5173

# WebSocket Configuration
VITE_SOCKET_URL=http://localhost:3000
```

</details>

---

## 🏃‍♂️ Development

<div align="center">

### 🎯 Main Commands

| Command | Description | Icon |
|---------|-------------|------|
| `npm run dev` | Start development server | 🟢 |
| `npm run build` | Build for production | 📦 |
| `npm run preview` | Preview production build | 👀 |
| `npm run lint` | Run ESLint | 🔍 |

</div>

### 📊 Development URLs

<div align="center">

| Service | URL | Description |
|---------|-----|-------------|
| 🌐 **Development Server** | http://localhost:5173 | Main application |
| 🔧 **API Backend** | http://localhost:3000 | Backend API endpoint |

</div>

---

## 🏗️ Project Architecture

```
📁 src/
├── 📄 App.tsx                 # Main application component
├── 🚪 main.tsx                # Application entry point
├── 🎨 index.css               # Global styles with custom scrollbars
├── 📦 api/                    # API client and services
├── 🖼️ assets/                 # Static assets (images, icons)
├── 🧩 components/             # Reusable UI components
│   ├── 🔘 appButton/          # Custom button components
│   ├── 📝 appInput/           # Custom input components
│   ├── 👤 avatar/             # User avatar component
│   ├── 🎥 customVideoPlayer/  # Video player component
│   ├── 🪟 draggableWindow/    # Draggable window component
│   ├── ✏️ editor/             # Text editor component
│   ├── 🏷️ logo/               # Brand logo component
│   ├── 📋 modals/             # Modal dialogs
│   ├── 👥 participantsHeader/ # Participants management
│   ├── 🔘 rightHeaderButtons/ # Header action buttons
│   ├── 🔘 roundButton/        # Round button component
│   ├── 🛣️ route/              # Route components
│   ├── 🔔 snackbar/           # Notification component
│   └── 📊 structureSidebar/   # Presentation structure with DnD
├── 🪝 hooks/                  # Custom React hooks
├── 📱 pages/                  # Page components
│   ├── 👨‍💼 admin/              # Admin dashboard
│   ├── 🔐 auth/               # Authentication pages
│   ├── 💬 chat/               # Chat interface
│   ├── 🔑 forgotPassword/     # Password reset
│   ├── 🏠 home/               # Home page
│   ├── 📧 inviteAccept/       # Invitation acceptance
│   ├── 🔑 login/              # Login page
│   ├── ❓ notFound/           # 404 page
│   ├── 📋 presentation/       # Presentation management
│   ├── ✏️ presentationEditText/ # Text editing interface
│   ├── 📝 register/           # Registration page
│   ├── 📄 static/             # Static pages
│   ├── 📺 teleprompter/       # Teleprompter interface
│   ├── 📊 userDashboard/      # User dashboard
│   └── 🎥 videoPlayerPage/    # Video player page
├── 📝 types/                  # TypeScript type definitions
├── 🛠️ utils/                  # Utility functions
└── ⚙️ constants.ts            # Application constants
```

---

## 🌐 Real-time Features

<div align="center">
<table>
<tr>
<td width="50%" valign="top">

### ✏️ **Collaborative Text Editing**
- 🔄 Real-time text synchronization
- 🖱️ Live cursor positions
- 👥 Multi-user editing sessions
- 🎯 Conflict resolution
- 💾 Auto-save functionality

### 📺 **Teleprompter Interface**
- 🎯 Reading position tracking
- 👑 Ownership management
- 🔄 Part transition animations
- ⏰ Reading confirmation UI
- 🔔 Visual notifications

</td>
<td width="50%" valign="top">

### 💬 **Live Communication**
- 💭 Real-time chat messages
- 🔔 Instant notifications
- 👥 User presence indicators
- 🎬 Presentation synchronization
- 📊 Live status updates

### 🎥 **Video Features**
- 🎬 Synchronized video playback
- 🖼️ Video preview generation
- 🔗 Share functionality

</td>
</tr>
</table>
</div>

---

## 🔧 Development Tools

<div align="center">

### 🛠️ Code Quality

| Tool | Purpose | Configuration |
|------|---------|---------------|
| **ESLint** | Code linting | Latest ESLint 9.x |
| **TypeScript** | Type checking | TypeScript 5.7 |
| **Vite** | Build tool | Vite 6.x with React plugin |

</div>

---

<div align="center">
  
**Built with ❤️ for seamless collaboration**

[![React](https://img.shields.io/badge/Made%20with-React-blue?style=for-the-badge&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/Powered%20by-TypeScript-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Built%20with-Vite-purple?style=for-the-badge&logo=vite)](https://vitejs.dev/)

</div>
