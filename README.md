# Ashboard

A modern, responsive dashboard application built with Next.js, featuring dynamic data visualization, interactive maps, and a sleek user interface.

## ✨ Features

- **📊 Dashboard Analytics**: Interactive data visualization and metrics
- **🗺️ Interactive Maps**: Integrated Leaflet maps for location-based data
- **🎨 Modern UI**: Built with NextUI, TailwindCSS, and custom animations
- **🌙 Theme Support**: Dark/light theme switching
- **📱 Responsive Design**: Mobile-first, responsive across all devices
- **🔐 Authentication**: User login and session management
- **⚡ Performance**: Optimized with Next.js and efficient state management

## 🛠️ Tech Stack

- **Frontend**: Next.js 14.1.3, React 18
- **UI Libraries**: NextUI, Radix UI, TailwindCSS, Bootstrap
- **State Management**: Redux Toolkit with Redux Persist
- **Maps**: React Leaflet
- **Icons**: FontAwesome, CoreUI Icons, Lucide React
- **Styling**: TailwindCSS with custom animations
- **Database**: MongoDB integration

## 🚀 Getting Started

### Prerequisites

- Node.js 16+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Ashboard
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
Ashboard/
├── components/           # Reusable UI components
│   ├── UI/              # Core UI components
│   ├── navigation/      # Navigation components
│   └── login/           # Authentication components
├── pages/               # Next.js pages
│   ├── api/            # API routes
│   ├── dashboard/      # Dashboard pages
│   ├── auth/           # Authentication pages
│   └── map/            # Map-related pages
├── store/              # Redux store configuration
├── data/               # Static data files
├── public/             # Static assets
└── styles/             # CSS and styling files
```

## 🎯 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file in the root directory:

```env
# Add your environment variables here
MONGODB_URI=your_mongodb_connection_string
NEXTAUTH_SECRET=your_nextauth_secret
```

## 🤝 Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👤 Author

**Raj Kumar Yadav**

---

Built with ❤️ using Next.js and modern web technologies.
