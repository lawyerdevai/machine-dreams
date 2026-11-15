export default function ArenaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col bg-[#f2ead8] text-[#15120f]">
      {children}
    </div>
  );
}
