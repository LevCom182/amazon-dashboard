import Image from "next/image"

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black text-foreground">
      <div className="flex flex-col items-center gap-4">
        <Image
          src="/coffee_parrot.gif"
          alt="Coffee Parrot"
          width={36}
          height={36}
          className="h-9 w-auto"
          unoptimized
        />
        <p className="text-lg font-medium text-muted-foreground">Lade Dashboard...</p>
      </div>
    </div>
  )
}


