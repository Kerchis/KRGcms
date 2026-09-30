<?php
/**
 * Token persistence.
 *
 * @package Meridian
 */

namespace Meridian\Design;

defined( 'ABSPATH' ) || exit;

class TokenRepository {

	public static function ensure_defaults(): void {
		$current = get_option( MERIDIAN_OPTION_TOKENS );
		if ( is_array( $current ) && ! empty( $current['tokens'] ) ) {
			return;
		}
		$preset = self::load_preset_file( 'marca' );
		if ( $preset ) {
			$preset['activePreset'] = 'marca';
			$preset['customColors'] = [];
			$preset['version']       = 1;
			update_option( MERIDIAN_OPTION_TOKENS, $preset, false );
		}
	}

	public static function get(): array {
		self::ensure_defaults();
		$data = get_option( MERIDIAN_OPTION_TOKENS, [] );
		return is_array( $data ) ? $data : [];
	}

	public static function save( array $data ): array {
		$data['version'] = 1;
		update_option( MERIDIAN_OPTION_TOKENS, $data, false );
		delete_transient( 'meridian_tokens_css' );
		\Meridian\Cache\DocumentCache::flush_chrome();
		return $data;
	}

	public static function patch_colors( array $colors ): array {
		$data = self::get();
		$data['tokens'] = $data['tokens'] ?? [];
		$data['tokens']['color'] = $data['tokens']['color'] ?? [];
		foreach ( $colors as $key => $value ) {
			$key = sanitize_key( (string) $key );
			$hex = sanitize_hex_color( (string) $value );
			if ( ! $key || ! $hex ) {
				continue;
			}
			$current = $data['tokens']['color'][ $key ] ?? [];
			if ( ! is_array( $current ) ) {
				$current = [ 'value' => $current ];
			}
			$current['value'] = $hex;
			$current['type']  = 'color';
			$data['tokens']['color'][ $key ] = $current;
		}
		return self::save( $data );
	}

	public static function activate_preset( string $slug ): array {
		$preset = self::load_preset_file( $slug );
		if ( ! $preset ) {
			return self::get();
		}
		$preset['activePreset'] = $slug;
		$preset['customColors'] = self::get()['customColors'] ?? [];
		$preset['version']       = 1;
		return self::save( $preset );
	}

	public static function load_preset_file( string $slug ): ?array {
		$slug = sanitize_file_name( $slug );
		$path = MERIDIAN_PATH . '/presets/' . $slug . '.json';
		if ( ! is_readable( $path ) ) {
			return null;
		}
		$json = json_decode( (string) file_get_contents( $path ), true );
		return is_array( $json ) ? $json : null;
	}

	public static function list_presets(): array {
		$out = [];
		foreach ( glob( MERIDIAN_PATH . '/presets/*.json' ) ?: [] as $file ) {
			$json = json_decode( (string) file_get_contents( $file ), true );
			if ( is_array( $json ) ) {
				$out[] = [
					'slug' => $json['slug'] ?? basename( $file, '.json' ),
					'name' => $json['name'] ?? basename( $file, '.json' ),
				];
			}
		}
		return $out;
	}
}
