import { Globe } from 'lucide-react';

import { useTranslation } from 'react-i18next';

const LanguageSwitcher = () => {

const { i18n } = useTranslation();

return (

<div className="flex items-center gap-2">

<Globe className="text-sky-600" size={18}/>

<select

value={i18n.language}

onChange={(e)=>i18n.changeLanguage(e.target.value)}

className="

h-11

rounded-2xl

border

border-sky-100

bg-white

px-4

text-sm

font-bold

outline-none

transition

focus:border-sky-400

"

>

<option value="vi">

🇻🇳 Tiếng Việt

</option>

<option value="en">

🇺🇸 English

</option>

</select>

</div>

);

};

export default LanguageSwitcher;