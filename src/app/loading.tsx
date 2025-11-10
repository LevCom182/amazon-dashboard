export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black text-foreground">
      <div className="flex flex-col items-center gap-4">
        {/* Spinner Animation */}
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-full border-4 border-muted-foreground/20"></div>
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-primary"></div>
        </div>
        <p className="text-lg font-medium text-muted-foreground">Lade Dashboard...</p>
      </div>
    </div>
  )
}


