import { useLanguageStore } from '../stores/languageStore';

export default function LanguageSelector() {
  const { language, setLanguage } = useLanguageStore();

  return (
    <div className="flex items-center gap-1 text-xs font-medium">
      <button
        onClick={() => setLanguage('en')}
        className={`px-2 py-1 rounded transition-colors ${
          language === 'en'
            ? 'bg-gray-900 text-white'
            : 'text-gray-500 hover:text-gray-900'
        }`}
      >
        EN
      </button>
      <span className="text-gray-300">|</span>
      <button
        onClick={() => setLanguage('rs')}
        className={`px-2 py-1 rounded transition-colors ${
          language === 'rs'
            ? 'bg-gray-900 text-white'
            : 'text-gray-500 hover:text-gray-900'
        }`}
      >
        RS
      </button>
    </div>
  );
}
