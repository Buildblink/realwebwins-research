"use client";

import { useState } from "react";

interface SearchBarProps {
  defaultValue?: string;
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

export function SearchBar({ defaultValue = "", onSearch, isLoading = false }: SearchBarProps) {
  const [value, setValue] = useState(defaultValue);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch(value.trim());
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="relative flex items-center overflow-hidden rounded-xl border border-white/10 bg-white/5 px-4 py-2 backdrop-blur"
    >
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search pain points (e.g. Etsy shipping automation)"
        className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none"
      />
      <button
        type="submit"
        disabled={isLoading}
        className="ml-3 rounded-lg bg-[#6366f1] px-3 py-1 text-sm font-medium text-white transition hover:bg-[#6366f1]/80 disabled:opacity-60"
      >
        {isLoading ? "Searching…" : "Search"}
      </button>
    </form>
  );
}
