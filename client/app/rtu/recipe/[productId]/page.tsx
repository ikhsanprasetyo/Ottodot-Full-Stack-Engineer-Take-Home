import RecipeBuilderClient from './recipe-builder-client';

export function generateStaticParams() {
  return [{ productId: '1' }];
}

export default function RecipeBuilderPage() {
  return <RecipeBuilderClient />;
}
