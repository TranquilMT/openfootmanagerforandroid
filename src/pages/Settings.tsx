import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import { useSettingsStore, type AppSettings } from "../store/settingsStore";
import { useTheme } from "../context/ThemeContext";
import { ThemeToggle, Select } from "../components/ui";
import { SUPPORTED_LANGUAGES, changeAppLanguage } from "../i18n";
import { formatAppVersion } from "../lib/appVersion";
import { ArrowLeft, Monitor, Moon, Sun, Gamepad2, Save, Zap, Trash2, Download, Globe, Type } from "lucide-react";

const CURRENCY_OPTIONS = [{value:"EUR",labelKey:"settings.currencyOptions.eur",symbol:"€"},{value:"GBP",labelKey:"settings.currencyOptions.gbp",symbol:"£"},{value:"USD",labelKey:"settings.currencyOptions.usd",symbol:"$"}] as const;
const THEME_OPTION_KEYS=["light","dark","system"] as const;
const MATCH_MODE_KEYS=["live","spectator","delegate"] as const;
const MATCH_SPEED_KEYS=["slow","normal","fast"] as const;
const UI_SCALE_KEYS=["small","normal","large","xlarge"] as const;

export default function Settings(){
 const navigate=useNavigate(); const location=useLocation(); const {t,i18n}=useTranslation();
 const {settings,loaded,loadSettings,updateSettings}=useSettingsStore(); const {theme,toggleTheme}=useTheme();
 const [confirmClear,setConfirmClear]=useState(false); const [clearSuccess,setClearSuccess]=useState(false); const [exportPath,setExportPath]=useState<string|null>(null);
 const returnTo=(location.state as {from?:string})?.from||"/";
 useEffect(()=>{if(!loaded)loadSettings();},[loaded,loadSettings]);
 useEffect(()=>{if(loaded&&settings.language&&settings.language!==i18n.language)void changeAppLanguage(settings.language);},[loaded,settings.language,i18n]);
 const handleUpdate=(partial:Partial<AppSettings>)=>{updateSettings(partial);if(partial.theme){const desired=partial.theme==="system"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):partial.theme;if(desired!==theme)toggleTheme();}if(partial.language)void changeAppLanguage(partial.language);};
 const handleClearSaves=async()=>{try{await invoke("clear_all_saves");setClearSuccess(true);setConfirmClear(false);setTimeout(()=>setClearSuccess(false),3000);}catch(err){console.error("Failed to clear saves:",err);}};
 const handleExportWorld=async()=>{try{const path=await invoke<string>("export_world_database",{exportPath:"exported_world.json"});setExportPath(path);setTimeout(()=>setExportPath(null),5000);}catch(err){console.error("Failed to export world:",err);}};
 if(!loaded)return <div className="min-h-dvh bg-gray-100 dark:bg-navy-900 flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"/></div>;
 return <div className="min-h-dvh bg-gray-100 dark:bg-navy-900 transition-colors overflow-x-hidden">
  <header className="sticky top-0 z-20 bg-white/95 dark:bg-navy-800/95 backdrop-blur border-b border-gray-200 dark:border-navy-700 shadow-sm"><div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between"><div className="flex items-center gap-2"><button type="button" onClick={()=>navigate(returnTo)} className="p-2 rounded-lg text-gray-400"><ArrowLeft className="w-5 h-5"/></button><h1 className="text-xl font-heading font-bold uppercase tracking-wide">{t("settings.title")}</h1></div><ThemeToggle/></div></header>
  <main className="w-full max-w-3xl mx-auto px-3 sm:px-6 py-4 sm:py-8 flex flex-col gap-4 sm:gap-8 overflow-y-auto">
   <Section title={t("settings.display")} icon={<Monitor className="w-5 h-5"/>}>
    <SettingRow label={t("settings.theme")} description={t("settings.themeDesc")}><SegmentedControl options={THEME_OPTION_KEYS.map(key=>({value:key,label:t(`settings.themeOptions.${key}`),icon:key==="light"?<Sun className="w-4 h-4"/>:key==="dark"?<Moon className="w-4 h-4"/>:<Monitor className="w-4 h-4"/>}))} value={settings.theme} onChange={v=>handleUpdate({theme:v as AppSettings["theme"]})}/></SettingRow>
    <SettingRow label={t("settings.language")} description={t("settings.languageDesc")}><Select value={settings.language} onChange={e=>handleUpdate({language:e.target.value})} icon={<Globe className="w-4 h-4"/>} className="w-full sm:min-w-48">{SUPPORTED_LANGUAGES.map(lang=><option key={lang.code} value={lang.code}>{t(lang.labelKey)}</option>)}</Select></SettingRow>
    <SettingRow label={t("settings.currency")} description={t("settings.currencyDesc")}><Select value={settings.currency} onChange={e=>handleUpdate({currency:e.target.value as AppSettings["currency"]})} className="w-full sm:min-w-48">{CURRENCY_OPTIONS.map(c=><option key={c.value} value={c.value}>{c.symbol} {t(c.labelKey)}</option>)}</Select></SettingRow>
    <SettingRow label={t("settings.uiScale")} description={t("settings.uiScaleDesc")}><div className="flex items-center gap-2 w-full"><Type className="w-4 h-4 text-gray-400 shrink-0"/><SegmentedControl options={UI_SCALE_KEYS.map(key=>({value:key,label:t(`settings.uiScaleOptions.${key}`)}))} value={settings.ui_scale} onChange={v=>handleUpdate({ui_scale:v as AppSettings["ui_scale"]})}/></div></SettingRow>
    <SettingRow label={t("settings.highContrast")} description={t("settings.highContrastDesc")}><Toggle checked={settings.high_contrast} onChange={v=>handleUpdate({high_contrast:v})}/></SettingRow>
   </Section>
   <Section title={t("settings.gameplay")} icon={<Gamepad2 className="w-5 h-5"/>}>
    <SettingRow label={t("settings.defaultMatchMode")} description={t("settings.defaultMatchModeDesc")}><Select value={settings.default_match_mode} onChange={e=>handleUpdate({default_match_mode:e.target.value as AppSettings["default_match_mode"]})} className="w-full sm:min-w-48">{MATCH_MODE_KEYS.map(k=><option key={k} value={k}>{t(`settings.matchModes.${k}`)}</option>)}</Select></SettingRow>
    <SettingRow label={t("settings.matchSpeed")} description={t("settings.matchSpeedDesc")}><SegmentedControl options={MATCH_SPEED_KEYS.map(k=>({value:k,label:t(`settings.speeds.${k}`)}))} value={settings.match_speed} onChange={v=>handleUpdate({match_speed:v as AppSettings["match_speed"]})}/></SettingRow>
    <SettingRow label={t("settings.matchCommentary")} description={t("settings.matchCommentaryDesc")}><Toggle checked={settings.show_match_commentary} onChange={v=>handleUpdate({show_match_commentary:v})}/></SettingRow>
    <SettingRow label={t("settings.confirmAdvance")} description={t("settings.confirmAdvanceDesc")}><Toggle checked={settings.confirm_advance} onChange={v=>handleUpdate({confirm_advance:v})}/></SettingRow>
    <SettingRow label={t("settings.continueToNextEvent")} description={t("settings.continueToNextEventDesc")}><Toggle checked={settings.continue_to_next_event} onChange={v=>handleUpdate({continue_to_next_event:v})}/></SettingRow>
   </Section>
   <Section title={t("settings.savesData")} icon={<Save className="w-5 h-5"/>}>
    <SettingRow label={t("settings.autoSave")} description={t("settings.autoSaveDesc")}><Toggle checked={settings.auto_save} onChange={v=>handleUpdate({auto_save:v})}/></SettingRow>
    <SettingRow label={t("settings.exportWorld")} description={t("settings.exportWorldDesc")}><button type="button" onClick={handleExportWorld} className="w-full sm:w-auto flex justify-center items-center gap-2 px-4 py-2 rounded-lg bg-primary-500/10 text-primary-500 font-heading font-bold uppercase"><Download className="w-4 h-4"/>{t("settings.export")}</button></SettingRow>{exportPath&&<p className="text-xs text-primary-500 break-all">{t("settings.exportedTo",{path:exportPath})}</p>}
    <SettingRow label={t("settings.clearSaves")} description={t("settings.clearSavesDesc")} danger>{confirmClear?<div className="flex gap-2"><button onClick={handleClearSaves} className="px-4 py-2 rounded-lg bg-red-500 text-white">{t("common.confirm")}</button><button onClick={()=>setConfirmClear(false)} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-navy-600">{t("common.cancel")}</button></div>:clearSuccess?<span className="text-primary-500">{t("settings.savesCleared")}</span>:<button onClick={()=>setConfirmClear(true)} className="w-full sm:w-auto flex justify-center items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-500"><Trash2 className="w-4 h-4"/>{t("settings.clear")}</button>}</SettingRow>
   </Section>
   <Section title={t("settings.about")} icon={<Zap className="w-5 h-5"/>}><div className="flex flex-wrap justify-between gap-2"><div><p className="text-sm font-medium">{t("app.name")}</p><p className="text-xs text-gray-500 mt-0.5">{formatAppVersion()}</p></div><span className="text-[10px] uppercase tracking-widest text-gray-400">{t("app.publisher")}</span></div></Section>
  </main>
 </div>;
}
function Section({title,icon,children}:{title:string;icon:React.ReactNode;children:React.ReactNode}){return <section className="bg-white dark:bg-navy-800 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-navy-700 shadow-sm overflow-hidden"><div className="flex items-center gap-2 px-4 sm:px-6 py-4 border-b border-gray-100 dark:border-navy-700"><span className="text-primary-500">{icon}</span><h2 className="text-sm font-heading font-bold uppercase tracking-wider">{title}</h2></div><div className="px-4 sm:px-6 py-4 flex flex-col gap-5">{children}</div></section>}
function SettingRow({label,description,danger,children}:{label:string;description:string;danger?:boolean;children:React.ReactNode}){return <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 w-full"><div className="w-full sm:flex-1"><p className={`text-sm font-medium break-words ${danger?"text-red-500":"text-gray-800 dark:text-gray-200"}`}>{label}</p><p className="text-xs text-gray-500 dark:text-gray-400 mt-1 break-words leading-relaxed">{description}</p></div><div className="w-full sm:w-auto sm:shrink-0">{children}</div></div>}
function Toggle({checked,onChange}:{checked:boolean;onChange:(v:boolean)=>void}){return <button type="button" aria-pressed={checked} onClick={()=>onChange(!checked)} className={`relative w-12 h-7 rounded-full transition-colors ${checked?"bg-primary-500":"bg-gray-300 dark:bg-navy-600"}`}><span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked?"translate-x-6":"translate-x-1"}`}/></button>}
function SegmentedControl({options,value,onChange}:{options:Array<{value:string;label?:string;icon?:React.ReactNode}>;value:string;onChange:(v:string)=>void}){return <div className="grid grid-cols-2 sm:flex w-full rounded-lg bg-gray-100 dark:bg-navy-700 p-1 border border-gray-200 dark:border-navy-600 gap-1">{options.map(opt=><button type="button" key={opt.value} onClick={()=>onChange(opt.value)} className={`min-w-0 flex justify-center items-center gap-1.5 px-2 py-2 rounded-md text-xs font-heading font-bold uppercase tracking-wide ${value===opt.value?"bg-white dark:bg-navy-500 text-primary-600 dark:text-primary-400 shadow-sm":"text-gray-500 dark:text-gray-400"}`}>{opt.icon}<span className="whitespace-normal text-center break-words">{opt.label||opt.value}</span></button>)}</div>}
