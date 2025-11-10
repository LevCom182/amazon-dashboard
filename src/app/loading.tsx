import Image from "next/image"

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black text-foreground">
      <div className="flex flex-col items-center gap-4">
        <Image
          src="/coffee_parrot.gif"
          alt="Coffee Parrot"
          width={45}
          height={45}
          className="h-11 w-auto"
          unoptimized
        />
        <p className="text-lg font-medium text-muted-foreground">Lade Dashboard...</p>
      </div>
    </div>
  )
}


