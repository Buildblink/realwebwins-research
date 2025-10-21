"use client";

import { useCallback } from "react";
import { Search } from "lucide-react";

interface VaultSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function VaultSearchBar({
  value,
  onChange,
  placeholder = "Search projects by title or description...",
}: VaultSearchBarProps) {
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange(event.target.value);
    },
    [onChange]
  );

  return (
    <div className="relative w-full">
      <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );
}
