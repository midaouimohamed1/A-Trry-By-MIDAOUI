import React, { useState } from 'react';
import { Sparkles, Shield, Layers, Cpu, Heart, FileText, Download, Check } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';
import { generateAccomplishmentReportPDF } from '../utils/pdfGenerator';

interface FooterProps {
  totalModels: number;
}

export const Footer: React.FC<FooterProps> = ({ totalModels }) => {
  const { direction, isRTL, t, formatNumber } = useLanguage();
  const [downloadingReport, setDownloadingReport] = useState<boolean>(false);
  const [reportDownloaded, setReportDownloaded] = useState<boolean>(false);

  const handleDownloadAccomplishmentReport = async () => {
    try {
      setDownloadingReport(true);
      await generateAccomplishmentReportPDF();
      setReportDownloaded(true);
      setTimeout(() => setReportDownloaded(false), 4000);
    } catch (err) {
      console.error('Failed to generate report PDF:', err);
    } finally {
      setDownloadingReport(false);
    }
  };

  return (
    <footer id="app-footer" className="bg-slate-950 text-white border-t border-slate-800/80 mt-20 relative overflow-hidden" dir={direction}>
      {/* Background ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-extrabold text-white">
                {t('footer.brandTitle')}
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-lg">
              {t('footer.brandDesc')}
            </p>

            {/* Direct PDF Accomplishment Report Button */}
            <div className="pt-2">
              <button
                onClick={handleDownloadAccomplishmentReport}
                disabled={downloadingReport}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/30 hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {reportDownloaded ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>{isRTL ? 'تم تنزيل تقرير الإنجاز بنجاح (PDF)' : 'Accomplishment Report Downloaded (PDF)'}</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 text-blue-200" />
                    <Download className="w-3.5 h-3.5" />
                    <span>{isRTL ? 'تحميل تقرير الإنجاز الشامل (PDF)' : 'Download Accomplishment Report (PDF)'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Stats Summary */}
          <div>
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              <span>{t('footer.contentsTitle')}</span>
            </h4>
            <ul className="space-y-2 text-xs text-slate-400 font-medium">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                <span>{t('footer.indexedModels', { count: formatNumber(totalModels) })}</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>{t('footer.specializedCategories')}</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                <span>{t('footer.continuousUpdates')}</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                <span>{t('footer.directLinks')}</span>
              </li>
            </ul>
          </div>

          {/* Interactive features */}
          <div>
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-400" />
              <span>{t('footer.interactiveTools')}</span>
            </h4>
            <ul className="space-y-2 text-xs text-slate-400 font-medium mb-4">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                <span>{t('footer.toolPlayground')}</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>{t('footer.toolCalculator')}</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                <span>{t('footer.toolWizard')}</span>
              </li>
            </ul>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-xl">
              <Cpu className="w-3.5 h-3.5" />
              <span>{t('footer.rightsReserved')}</span>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            {t('footer.rightsReserved')}
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <span>Crafted for the AI Engineering Community</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
          </div>
        </div>
      </div>
    </footer>
  );
};

