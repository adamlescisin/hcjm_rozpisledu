"use client";

import { useState } from "react";
import { EventCategory } from "@prisma/client";
import { Plus, Pencil, Trash2, Save, X, Loader2, GripVertical } from "lucide-react";

const PRESET_COLORS = [
  "#EAB308",
  "#C8102E",
  "#3B82F6",
  "#22C55E",
  "#8B5CF6",
  "#F97316",
  "#06B6D4",
  "#EC4899",
  "#6B7280",
];

interface Props {
  categories: EventCategory[];
}

const emptyForm = {
  name: "",
  color: PRESET_COLORS[0],
  icon: "",
  defaultDurationMinutes: 60,
  requiresIceResurfacingBefore: false,
  requiresIceResurfacingAfter: false,
  resurfacingDurationMinutes: 15,
  isActive: true,
  sortOrder: 0,
};

export default function AdminCategoriesClient({ categories: initial }: Props) {
  const [categories, setCategories] = useState(initial);
  const [editId, setEditId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (id?: string) => {
    setLoading(true);
    setError(null);

    const url = id ? `/api/admin/categories/${id}` : "/api/admin/categories";
    const method = id ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, sortOrder: id ? form.sortOrder : categories.length }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Chyba");
      setLoading(false);
      return;
    }

    if (id) {
      setCategories((prev) => prev.map((c) => (c.id === id ? data : c)));
      setEditId(null);
    } else {
      setCategories((prev) => [...prev, data]);
      setShowAdd(false);
      setForm(emptyForm);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Smazat kategorii? Pokud má přiřazené události, nebude to možné.")) return;
    const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error);
      return;
    }
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const startEdit = (cat: EventCategory) => {
    setEditId(cat.id);
    setForm({
      name: cat.name,
      color: cat.color,
      icon: cat.icon ?? "",
      defaultDurationMinutes: cat.defaultDurationMinutes,
      requiresIceResurfacingBefore: cat.requiresIceResurfacingBefore,
      requiresIceResurfacingAfter: cat.requiresIceResurfacingAfter,
      resurfacingDurationMinutes: cat.resurfacingDurationMinutes,
      isActive: cat.isActive,
      sortOrder: cat.sortOrder,
    });
  };

  return (
