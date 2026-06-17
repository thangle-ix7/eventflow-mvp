import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  return (
    <label className="flex min-w-0 items-center gap-1.5 sm:gap-2">
      <span className="sr-only">Ngôn ngữ</span>
      <Globe className="hidden h-[18px] w-[18px] shrink-0 text-sky-600 min-[380px]:block" />

      <select
        value={i18n.language}
        onChange={(event) => i18n.changeLanguage(event.target.value)}
        className="h-10 w-[4.25rem] min-w-0 rounded-2xl border border-sky-100 bg-white px-2 text-xs font-bold outline-none transition focus:border-sky-400 sm:h-11 sm:w-auto sm:px-4 sm:text-sm"
      >
        <option value="vi">VI</option>
        <option value="en">EN</option>
      </select>
    </label>
  );
};

export default LanguageSwitcher;
