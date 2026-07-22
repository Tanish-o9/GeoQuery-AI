import React from 'react';
import { useMap } from '../context/MapContext';
import { toast } from 'react-hot-toast';

const LanguageSelector = () => {
    const { language, setLanguage } = useMap();

    const handleLanguageChange = (e) => {
        const selected = e.target.value;
        setLanguage(selected);
        
        const welcomeMsgs = {
            en: "Language set to English",
            hi: "भाषा बदलकर हिंदी कर दी गई है",
            es: "Idioma cambiado a Español"
        };
        toast.success(welcomeMsgs[selected] || "Language Updated");
    };

    return (
        <div className="absolute top-5 right-[420px] z-[1000] bg-gray-900/95 border border-gray-800 rounded-xl px-2.5 py-1.5 shadow-lg flex items-center gap-1.5 backdrop-blur-md">
            <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider font-mono">🌐 Lang:</span>
            <select
                value={language}
                onChange={handleLanguageChange}
                className="bg-transparent text-white text-xs font-semibold font-mono outline-none cursor-pointer border-none pr-4"
            >
                <option value="en" className="bg-gray-950 text-white">English (EN)</option>
                <option value="hi" className="bg-gray-950 text-white">हिन्दी (HI)</option>
                <option value="es" className="bg-gray-950 text-white">Español (ES)</option>
            </select>
        </div>
    );
};

export default LanguageSelector;
