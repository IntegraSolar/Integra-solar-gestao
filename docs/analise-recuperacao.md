# Análise da Recuperação

## Resumo rapido

O material enviado estava misturado entre:

- uma versão principal do frontend em HTML unico;
- um backend Node separado em zip;
- um SQL solto;
- um arquivo `.tmp` que na verdade era um zip com Várias versões antigas e um SQL alternativo;
- zips pequenos que pareciam placeholders ou sobras de Exportação.

## Versão principal escolhida

Usei como base principal:

- frontend: `integra_solar_v5_30.html`
- backend: `integra-solar-backend-main.zip`
- banco: copia de `integra_solar_supabase.sql` extraida do backup `.tmp`

Motivos:

- o frontend `v5_30` e o `integra_solar_v5.html` do backup sao equivalentes em tamanho e estrutura;
- o SQL do backup estava melhor codificado e com Criação de tipos mais segura;
- o backend zipado esta separado e consistente com o frontend.

## O que foi para reciclagem

A pasta `../reciclar-referencias` recebeu:

- versões antigas do frontend;
- placeholders zipados muito pequenos;
- o SQL solto menos confiavel;
- o backup `.tmp` original e sua extracao.

## O que parece faltar

Não encontrei:

- templates `.docx` das propostas;
- imagens externas ou pacote de assets separado;
- dump de dados reais do banco;
- confirmacao de que o backend em Railway ainda esta ativo;
- qualquer Histórico Git.

## Riscos e Observações

- O frontend tem URL e chave publica do Supabase embutidas.
- Existe um login local de emergência no HTML.
- Sem o banco configurado, Várias telas vao abrir, mas parte das operações vai ficar limitada.
- Sem LibreOffice no ambiente do backend, a Conversão profissional para PDF Não funciona.
