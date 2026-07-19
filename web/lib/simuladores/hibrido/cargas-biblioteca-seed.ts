// web/lib/simuladores/hibrido/cargas-biblioteca-seed.ts
// Biblioteca padrão de cargas típicas (residenciais e rurais), copiada para
// cada empresa no primeiro acesso à tela de cargas.
//
// Dois campos merecem atenção porque alimentam verificações do motor:
//  - potenciaPartidaW: motores e compressores partem com várias vezes a
//    potência nominal. É o que exercita a checagem de surge do inversor.
//  - horaInicio/horaFim: definem a curva de 24 h e, portanto, o pico de
//    demanda. 0 → 24 significa disponível o dia inteiro.
import type { CargaBibliotecaData } from './cargas-biblioteca-schemas'

export const CARGAS_BIBLIOTECA_SEED: CargaBibliotecaData[] = [
  { nome: 'Lâmpada LED 12 W', categoria: 'Iluminação', potenciaUnitW: 12, potenciaPartidaW: 12, tensaoV: 220, fatorPotencia: 0.92, horasDia: 5, diasSemana: 7, horaInicio: 18, horaFim: 23, prioridade: 'Alta', critica: true },
  { nome: 'Geladeira duplex', categoria: 'Refrigeração', potenciaUnitW: 150, potenciaPartidaW: 600, tensaoV: 220, fatorPotencia: 0.85, horasDia: 10, diasSemana: 7, horaInicio: 0, horaFim: 24, prioridade: 'Alta', critica: true },
  { nome: 'Freezer horizontal', categoria: 'Refrigeração', potenciaUnitW: 200, potenciaPartidaW: 800, tensaoV: 220, fatorPotencia: 0.85, horasDia: 10, diasSemana: 7, horaInicio: 0, horaFim: 24, prioridade: 'Alta', critica: true },
  { nome: 'Chuveiro elétrico', categoria: 'Aquecimento', potenciaUnitW: 5500, potenciaPartidaW: 5500, tensaoV: 220, fatorPotencia: 1, horasDia: 0.7, diasSemana: 7, horaInicio: 18, horaFim: 21, prioridade: 'Média', critica: false },
  { nome: 'Torneira elétrica', categoria: 'Aquecimento', potenciaUnitW: 3000, potenciaPartidaW: 3000, tensaoV: 220, fatorPotencia: 1, horasDia: 0.3, diasSemana: 7, horaInicio: 6, horaFim: 8, prioridade: 'Baixa', critica: false },
  { nome: 'Ar-condicionado 9.000 BTU', categoria: 'Refrigeração', potenciaUnitW: 900, potenciaPartidaW: 2700, tensaoV: 220, fatorPotencia: 0.9, horasDia: 8, diasSemana: 7, horaInicio: 20, horaFim: 6, prioridade: 'Média', critica: false },
  { nome: 'Ar-condicionado 12.000 BTU', categoria: 'Refrigeração', potenciaUnitW: 1200, potenciaPartidaW: 3600, tensaoV: 220, fatorPotencia: 0.9, horasDia: 8, diasSemana: 7, horaInicio: 20, horaFim: 6, prioridade: 'Média', critica: false },
  { nome: 'Ventilador de teto', categoria: 'Motor', potenciaUnitW: 100, potenciaPartidaW: 200, tensaoV: 220, fatorPotencia: 0.9, horasDia: 8, diasSemana: 7, horaInicio: 20, horaFim: 6, prioridade: 'Baixa', critica: false },
  { nome: 'TV LED 43"', categoria: 'Eletrônico', potenciaUnitW: 100, potenciaPartidaW: 100, tensaoV: 220, fatorPotencia: 0.9, horasDia: 5, diasSemana: 7, horaInicio: 18, horaFim: 23, prioridade: 'Baixa', critica: false },
  { nome: 'Notebook', categoria: 'Eletrônico', potenciaUnitW: 65, potenciaPartidaW: 65, tensaoV: 220, fatorPotencia: 0.9, horasDia: 6, diasSemana: 5, horaInicio: 8, horaFim: 18, prioridade: 'Média', critica: false },
  { nome: 'Roteador Wi-Fi', categoria: 'Eletrônico', potenciaUnitW: 10, potenciaPartidaW: 10, tensaoV: 220, fatorPotencia: 0.9, horasDia: 24, diasSemana: 7, horaInicio: 0, horaFim: 24, prioridade: 'Alta', critica: true },
  { nome: 'Câmera de segurança', categoria: 'Eletrônico', potenciaUnitW: 15, potenciaPartidaW: 15, tensaoV: 220, fatorPotencia: 0.9, horasDia: 24, diasSemana: 7, horaInicio: 0, horaFim: 24, prioridade: 'Alta', critica: true },
  // FP 0,7: apesar de aquecer, o micro-ondas não é resistivo puro — o conjunto
  // transformador + magnetron tem fator de potência típico de 0,7.
  { nome: 'Micro-ondas', categoria: 'Aquecimento', potenciaUnitW: 1400, potenciaPartidaW: 1400, tensaoV: 220, fatorPotencia: 0.7, horasDia: 0.5, diasSemana: 7, horaInicio: 11, horaFim: 13, prioridade: 'Baixa', critica: false },
  { nome: 'Forno elétrico', categoria: 'Aquecimento', potenciaUnitW: 1500, potenciaPartidaW: 1500, tensaoV: 220, fatorPotencia: 1, horasDia: 0.5, diasSemana: 3, horaInicio: 18, horaFim: 20, prioridade: 'Baixa', critica: false },
  { nome: 'Cafeteira', categoria: 'Aquecimento', potenciaUnitW: 800, potenciaPartidaW: 800, tensaoV: 220, fatorPotencia: 1, horasDia: 0.3, diasSemana: 7, horaInicio: 6, horaFim: 8, prioridade: 'Baixa', critica: false },
  { nome: 'Ferro de passar', categoria: 'Aquecimento', potenciaUnitW: 1000, potenciaPartidaW: 1000, tensaoV: 220, fatorPotencia: 1, horasDia: 0.5, diasSemana: 2, horaInicio: 14, horaFim: 16, prioridade: 'Baixa', critica: false },
  { nome: 'Máquina de lavar roupa', categoria: 'Motor', potenciaUnitW: 500, potenciaPartidaW: 1500, tensaoV: 220, fatorPotencia: 0.8, horasDia: 1, diasSemana: 3, horaInicio: 9, horaFim: 11, prioridade: 'Baixa', critica: false },
  { nome: 'Secadora de roupa', categoria: 'Aquecimento', potenciaUnitW: 2500, potenciaPartidaW: 3000, tensaoV: 220, fatorPotencia: 0.95, horasDia: 1, diasSemana: 2, horaInicio: 10, horaFim: 12, prioridade: 'Baixa', critica: false },
  { nome: 'Liquidificador', categoria: 'Motor', potenciaUnitW: 300, potenciaPartidaW: 900, tensaoV: 220, fatorPotencia: 0.85, horasDia: 0.2, diasSemana: 7, horaInicio: 7, horaFim: 9, prioridade: 'Baixa', critica: false },
  { nome: 'Portão eletrônico', categoria: 'Motor', potenciaUnitW: 300, potenciaPartidaW: 900, tensaoV: 220, fatorPotencia: 0.8, horasDia: 0.2, diasSemana: 7, horaInicio: 6, horaFim: 22, prioridade: 'Média', critica: false },
  { nome: "Bomba d'água 1/2 CV", categoria: 'Motor', potenciaUnitW: 370, potenciaPartidaW: 1480, tensaoV: 220, fatorPotencia: 0.8, horasDia: 2, diasSemana: 7, horaInicio: 6, horaFim: 8, prioridade: 'Alta', critica: true },
  { nome: "Bomba d'água 1 CV", categoria: 'Motor', potenciaUnitW: 750, potenciaPartidaW: 3000, tensaoV: 220, fatorPotencia: 0.8, horasDia: 2, diasSemana: 7, horaInicio: 6, horaFim: 8, prioridade: 'Alta', critica: true },
  { nome: 'Bomba de piscina', categoria: 'Motor', potenciaUnitW: 550, potenciaPartidaW: 2200, tensaoV: 220, fatorPotencia: 0.8, horasDia: 4, diasSemana: 7, horaInicio: 8, horaFim: 14, prioridade: 'Baixa', critica: false },
  { nome: 'Motor monofásico 2 CV', categoria: 'Motor', potenciaUnitW: 1500, potenciaPartidaW: 6000, tensaoV: 220, fatorPotencia: 0.8, horasDia: 3, diasSemana: 6, horaInicio: 8, horaFim: 17, prioridade: 'Média', critica: false },
  { nome: 'Ordenhadeira', categoria: 'Motor', potenciaUnitW: 1100, potenciaPartidaW: 4400, tensaoV: 220, fatorPotencia: 0.8, horasDia: 2, diasSemana: 7, horaInicio: 5, horaFim: 7, prioridade: 'Alta', critica: true },
  { nome: 'Cerca elétrica rural', categoria: 'Eletrônico', potenciaUnitW: 20, potenciaPartidaW: 20, tensaoV: 220, fatorPotencia: 0.9, horasDia: 24, diasSemana: 7, horaInicio: 0, horaFim: 24, prioridade: 'Alta', critica: true },
]
