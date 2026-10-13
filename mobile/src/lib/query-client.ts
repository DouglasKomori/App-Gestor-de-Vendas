import { QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/lib/api';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Só repete quando a falha foi de conexão; erro devolvido pela API não muda tentando de novo.
      retry: (tentativas, erro) => erro instanceof ApiError && erro.status === 0 && tentativas < 2,
    },
  },
});
