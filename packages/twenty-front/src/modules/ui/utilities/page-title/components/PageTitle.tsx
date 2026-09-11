import { Helmet } from '@dr.pogodin/react-helmet';

import { useWorkspaceSurface } from '@/ui/layout/hooks/useWorkspaceSurface';
import { PRODUCT_NAME } from '~/constants/brand';

type PageTitleProps = {
  title: string;
};

export const PageTitle = (props: PageTitleProps) => {
  const workspaceSurface = useWorkspaceSurface();

  if (workspaceSurface.type === 'side-panel') {
    return null;
  }

  return (
    <Helmet>
      <title>
        {props.title === PRODUCT_NAME
          ? PRODUCT_NAME
          : `${props.title} | ${PRODUCT_NAME}`}
      </title>
    </Helmet>
  );
};
