<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ResizeBookingRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'end_time' => 'required|date',
        ];
    }
}