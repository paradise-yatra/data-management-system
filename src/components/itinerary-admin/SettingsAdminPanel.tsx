import { useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import type { ItineraryBuilderSetting } from '@/services/logicTravelApi';
import { logicTravelApi } from '@/services/logicTravelApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const SettingsAdminPanel = () => {
  const [settings, setSettings] = useState<ItineraryBuilderSetting[]>([]);
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const loadSettings = async () => {
    try {
      const response = await logicTravelApi.settings.list();
      const data = response.data || [];
      setSettings(data);
      const draft: Record<string, string> = {};
      for (const setting of data) {
        draft[setting.key] =
          typeof setting.value === 'string' ? setting.value : JSON.stringify(setting.value);
      }
      setDraftValues(draft);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load settings');
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const orderedSettings = useMemo(
    () => [...settings].sort((a, b) => a.key.localeCompare(b.key)),
    [settings]
  );

  const parseValue = (value: string): unknown => {
    const trimmed = value.trim();
    if (trimmed === '') return '';
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    const numeric = Number(trimmed);
    if (!Number.isNaN(numeric) && trimmed === String(numeric)) {
      return numeric;
    }
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  };

  const handleSave = async (setting: ItineraryBuilderSetting) => {
    const rawValue = draftValues[setting.key] ?? '';
    setSavingKey(setting.key);
    try {
      await logicTravelApi.settings.update(setting.key, {
        value: parseValue(rawValue),
        description: setting.description || '',
      });
      toast.success(`Saved ${setting.key}`);
      await loadSettings();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save setting');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Logic Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {orderedSettings.map((setting) => (
          <div key={setting.key} className="rounded-md border border-border p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{setting.key}</p>
                {setting.description && (
                  <p className="text-xs text-muted-foreground">{setting.description}</p>
                )}
              </div>
              <Button
                type="button"
                size="sm"
                className="gap-2"
                onClick={() => handleSave(setting)}
                disabled={savingKey === setting.key}
              >
                <Save className="h-4 w-4" />
                {savingKey === setting.key ? 'Saving...' : 'Save'}
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Value</Label>
              <Input
                value={draftValues[setting.key] ?? ''}
                onChange={(event) =>
                  setDraftValues((prev) => ({
                    ...prev,
                    [setting.key]: event.target.value,
                  }))
                }
              />
            </div>
          </div>
        ))}
        {orderedSettings.length === 0 && (
          <p className="text-sm text-muted-foreground">No settings found.</p>
        )}
      </CardContent>
    </Card>
  );
};

