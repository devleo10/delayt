import Dashboard from '@/components/Dashboard';

export default function SharePage({
  params,
}: {
  params: { slug: string };
}) {
  return <Dashboard initialSlug={params.slug} />;
}