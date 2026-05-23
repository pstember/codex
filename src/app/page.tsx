import { PublicStorefront } from "@/app/components/PublicStorefront";

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{
    version?: string;
  }>;
}) {
  const params = await searchParams;

  return <PublicStorefront version={params?.version} />;
}
