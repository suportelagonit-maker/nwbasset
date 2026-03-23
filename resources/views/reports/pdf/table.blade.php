<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>{{ $title }}</title>
    <style>
        body {
            font-family: DejaVu Sans, sans-serif;
            color: #17352f;
            font-size: 11px;
        }

        h1 {
            margin: 0 0 8px;
            font-size: 22px;
        }

        .meta {
            margin-bottom: 18px;
            color: #50635e;
        }

        .filters {
            margin: 8px 0 14px;
        }

        .filters span {
            display: inline-block;
            margin-right: 12px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        th, td {
            border: 1px solid #cfd9d5;
            padding: 8px 10px;
            vertical-align: top;
            text-align: left;
        }

        th {
            background: #e6f0ed;
            font-weight: bold;
        }

        tbody tr:nth-child(even) {
            background: #f8fbfa;
        }
    </style>
</head>
<body>
    <h1>{{ $title }}</h1>
    <div class="meta">
        <div>Gerado em: {{ $generatedAt }}</div>
        @if(!empty($filters))
            <div class="filters">
                @foreach($filters as $label => $value)
                    <span><strong>{{ $label }}:</strong> {{ $value }}</span>
                @endforeach
            </div>
        @endif
    </div>

    <table>
        <thead>
            <tr>
                @foreach($headers as $header)
                    <th>{{ $header }}</th>
                @endforeach
            </tr>
        </thead>
        <tbody>
            @forelse($rows as $row)
                <tr>
                    @foreach($row as $cell)
                        <td>{{ $cell }}</td>
                    @endforeach
                </tr>
            @empty
                <tr>
                    <td colspan="{{ count($headers) }}">Nenhum dado encontrado para os filtros informados.</td>
                </tr>
            @endforelse
        </tbody>
    </table>
</body>
</html>
