                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{cat.name}</span>
                    {!cat.isActive && (
                      <span className="text-xs text-gray-400 bg-gray-100 px-1.5 rounded">Neaktivní</span>
                    )}
                    {(cat.requiresIceResurfacingBefore || cat.requiresIceResurfacingAfter) && (
                      <span className="text-xs text-blue-600 bg-blue-50 px-1.5 rounded">Úprava ledu</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">
                    {cat.defaultDurationMinutes} min
                    {cat.requiresIceResurfacingBefore && ` · ${cat.resurfacingDurationMinutes} min před`}
                    {cat.requiresIceResurfacingAfter && ` · ${cat.resurfacingDurationMinutes} min po`}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => startEdit(cat)}
                    className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface FormProps {
  form: typeof emptyForm;
  setForm: (f: typeof emptyForm) => void;
  onSave: () => void;
  onCancel: () => void;
  loading: boolean;
  error: string | null;
}

function CategoryForm({ form, setForm, onSave, onCancel, loading, error }: FormProps) {
  const f = (key: keyof typeof emptyForm) => (
    value: string | number | boolean
  ) => setForm({ ...form, [key]: value });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">Název *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => f("name")(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            placeholder="Trénink hokej"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Výchozí délka (min)</label>
          <input
            type="number"
            value={form.defaultDurationMinutes}
            onChange={(e) => f("defaultDurationMinutes")(parseInt(e.target.value))}
            min={15} max={480} step={15}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Barva *</label>
        <div className="flex flex-wrap gap-2 items-center">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => f("color")(color)}
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                form.color === color ? "border-gray-900 scale-110" : "border-transparent"
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
          <input
            type="color"
            value={form.color}
            onChange={(e) => f("color")(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border border-gray-300"
            title="Vlastní barva"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={form.requiresIceResurfacingBefore}
            onChange={(e) => f("requiresIceResurfacingBefore")(e.target.checked)}
            className="w-4 h-4 accent-[var(--color-primary)]"
          />
          Úprava ledu před
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={form.requiresIceResurfacingAfter}
            onChange={(e) => f("requiresIceResurfacingAfter")(e.target.checked)}
            className="w-4 h-4 accent-[var(--color-primary)]"
          />
          Úprava ledu po
        </label>
        {(form.requiresIceResurfacingBefore || form.requiresIceResurfacingAfter) && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Délka úpravy (min)</label>
            <input
              type="number"
              value={form.resurfacingDurationMinutes}
              onChange={(e) => f("resurfacingDurationMinutes")(parseInt(e.target.value))}
              min={5} max={60} step={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => f("isActive")(e.target.checked)}
          className="w-4 h-4 accent-[var(--color-primary)]"
        />
        Aktivní (zobrazuje se v rozpisu)
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
        >
          <X size={14} />
          Zrušit
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={loading || !form.name || !form.color}
          className="flex items-center gap-1 px-3 py-1.5 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-60"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Uložit
        </button>
      </div>
    </div>
  );
}
