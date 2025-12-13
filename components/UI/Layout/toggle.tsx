import { useState } from 'react';

const SwitchExample = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <input
        type="checkbox"
        id="dark-mode-switch"
        checked={isDarkMode}
        onChange={(e) => setIsDarkMode(e.target.checked)}
        className="w-4 h-4 rounded"
      />
      <label htmlFor="dark-mode-switch" className="text-sm font-medium cursor-pointer">
        Dark Mode
      </label>
    </div>
  );
};

export default SwitchExample;