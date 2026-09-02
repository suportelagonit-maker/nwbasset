export type RootStackParamList = {
  Login: undefined;
  Inventarios: undefined;
  InventarioExecucao: {
    inventarioId: number;
    inventarioNome: string;
  };
  Scanner: {
    inventarioId: number;
  };
  BemDetalhe: {
    inventarioId: number;
    inventarioItemId: number;
    bemPatrimonialId: number;
  };
  RegistrarDivergencia: {
    inventarioId: number;
    bemPatrimonialId: number;
    inventarioItemId: number;
  };
};
