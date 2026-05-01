import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { occasionConfigApi } from '../../api/occasionConfig';

interface OccasionConfig {
  id: number;
  occasionType: number;
  label: string;
  color: string;
  pendingColor: string;
  requiresApproval: boolean;
}

export default function OccasionSettingsPage() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const [edits, setEdits] = useState<Record<number, Partial<OccasionConfig>>>({});

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['occasionConfigs'],
    queryFn: occasionConfigApi.getAll,
  });

  const updateMutation = useMutation({
    mutationFn: ({ type, data }: { type: number; data: object }) =>
      occasionConfigApi.update(type, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['occasionConfigs'] });
      toast.success(t('toast.settingsSaved'));
    },
    onError: () => toast.error(t('toast.settingsFailed')),
  });

  const getEdit = (config: OccasionConfig) => ({
    ...config,
    ...edits[config.occasionType],
  });

  const setEdit = (type: number, field: string, value: any) => {
    setEdits(prev => ({
      ...prev,
      [type]: { ...prev[type], [field]: value }
    }));
  };

  const save = (config: OccasionConfig) => {
    const current = getEdit(config);
    updateMutation.mutate({
      type: config.occasionType,
      data: {
        color: current.color,
        pendingColor: current.pendingColor,
        requiresApproval: current.requiresApproval,
      }
    });
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">{t('occasionSettings.title')}</h2>
        <p className="text-sm text-gray-500 mt-0.5">{t('occasionSettings.subtitle')}</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">{t('occasionSettings.loading')}</p>
      ) : (
        <div className="space-y-4">
          {configs.map((config: OccasionConfig) => {
            const current = getEdit(config);
            return (
              <div
                key={config.occasionType}
                className="bg-white border border-gray-200 rounded-2xl p-6"
              >
                <div className="flex items-center gap-3 mb-5">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: current.color }}
                  />
                  <h3 className="text-base font-medium text-gray-900">{config.label}</h3>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('occasionSettings.confirmedColor')}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={current.color}
                        onChange={(e) => setEdit(config.occasionType, 'color', e.target.value)}
                        className="w-10 h-10 rounded border border-gray-300 cursor-pointer p-0.5"
                      />
                      <input
                        type="text"
                        value={current.color}
                        onChange={(e) => setEdit(config.occasionType, 'color', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('occasionSettings.pendingColor')}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={current.pendingColor}
                        onChange={(e) => setEdit(config.occasionType, 'pendingColor', e.target.value)}
                        className="w-10 h-10 rounded border border-gray-300 cursor-pointer p-0.5"
                      />
                      <input
                        type="text"
                        value={current.pendingColor}
                        onChange={(e) => setEdit(config.occasionType, 'pendingColor', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={current.requiresApproval}
                      onChange={(e) =>
                        setEdit(config.occasionType, 'requiresApproval', e.target.checked)
                      }
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">
                      {t('occasionSettings.requiresApproval')}
                    </span>
                  </label>

                  <button
                    onClick={() => save(config)}
                    disabled={updateMutation.isPending}
                    className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    {t('occasionSettings.save')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
