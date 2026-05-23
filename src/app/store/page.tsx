import { redirect } from "next/navigation";

export default async function StoreCompatibilityPage({
  searchParams,
}: {
  searchParams?: Promise<{
    version?: string;
  }>;
}) {
  const params = await searchParams;

  redirect(params?.version ? `/?version=${encodeURIComponent(params.version)}` : "/");
}
