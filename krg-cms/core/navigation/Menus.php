<?php
/**
 * Menus, header, footer documents.
 *
 * @package Meridian
 */

namespace Meridian\Navigation;

defined( 'ABSPATH' ) || exit;

class Menus {

	public static function all(): array {
		$menus = get_option( MERIDIAN_OPTION_MENUS, [] );
		if ( ! is_array( $menus ) || ! $menus ) {
			$menus = self::defaults();
			update_option( MERIDIAN_OPTION_MENUS, $menus, false );
		}
		return $menus;
	}

	public static function save( array $menus ): array {
		$clean = [];
		foreach ( $menus as $menu ) {
			if ( ! is_array( $menu ) ) {
				continue;
			}
			$clean[] = [
				'slug'  => sanitize_key( $menu['slug'] ?? 'menu' ),
				'name'  => sanitize_text_field( $menu['name'] ?? '' ),
				'items' => self::items( $menu['items'] ?? [] ),
			];
		}
		update_option( MERIDIAN_OPTION_MENUS, $clean, false );
		return $clean;
	}

	public static function items( array $items ): array {
		$out = [];
		foreach ( $items as $it ) {
			if ( ! is_array( $it ) ) {
				continue;
			}
			$out[] = [
				'id'      => sanitize_text_field( $it['id'] ?? wp_generate_uuid4() ),
				'label'   => sanitize_text_field( $it['label'] ?? '' ),
				'type'    => ( $it['type'] ?? 'internal' ) === 'external' ? 'external' : 'internal',
				'pageId'  => absint( $it['pageId'] ?? 0 ),
				'url'     => \Meridian\Security\UrlValidator::sanitize( $it['url'] ?? '' ),
				'target'  => ( $it['target'] ?? '_self' ) === '_blank' ? '_blank' : '_self',
				'visible' => array_key_exists( 'visible', $it ) ? (bool) $it['visible'] : true,
				'children'=> self::items( $it['children'] ?? [] ),
			];
		}
		return $out;
	}

	public static function by_slug( string $slug ): array {
		foreach ( self::all() as $m ) {
			if ( ( $m['slug'] ?? '' ) === $slug ) {
				return $m;
			}
		}
		return [ 'slug' => $slug, 'name' => $slug, 'items' => [] ];
	}

	public static function render( string $slug, int $depth = 0 ): string {
		$menu = self::by_slug( $slug );
		return self::render_items( $menu['items'] ?? [], $depth );
	}

	public static function render_items( array $items, int $depth = 0 ): string {
		if ( ! $items ) {
			return '';
		}
		$html = '<ul class="m-nav-list' . ( $depth ? ' m-nav-sub' : '' ) . '">';
		foreach ( $items as $it ) {
			if ( empty( $it['visible'] ) ) {
				continue;
			}
			$url = $it['url'] ?? '';
			if ( ( $it['type'] ?? 'internal' ) === 'internal' && ! empty( $it['pageId'] ) ) {
				$perma = get_permalink( (int) $it['pageId'] );
				if ( $perma ) {
					$url = $perma;
				}
			}
			$current = ( $url && untrailingslashit( $url ) === untrailingslashit( home_url( add_query_arg( [] ) ) ) );
			$li      = $current ? ' class="is-current"' : '';
			$target  = ( $it['target'] ?? '_self' ) === '_blank' ? ' target="_blank" rel="noopener noreferrer"' : '';
			$html   .= '<li' . $li . '><a href="' . esc_url( $url ?: '#' ) . '"' . $target . '>' . esc_html( $it['label'] ?? '' ) . '</a>';
			if ( ! empty( $it['children'] ) ) {
				$html .= self::render_items( $it['children'], $depth + 1 );
			}
			$html .= '</li>';
		}
		$html .= '</ul>';
		return $html;
	}

	public static function defaults(): array {
		$home = (int) get_option( 'page_on_front' );
		$pages = get_posts(
			[
				'post_type'      => 'page',
				'post_status'    => 'publish',
				'posts_per_page' => 8,
				'orderby'        => 'menu_order',
				'order'          => 'ASC',
			]
		);
		$items = [];
		foreach ( $pages as $p ) {
			$items[] = [
				'id'      => 'itm_' . $p->ID,
				'label'   => $p->post_title,
				'type'    => 'internal',
				'pageId'  => $p->ID,
				'url'     => '',
				'target'  => '_self',
				'visible' => true,
				'children'=> [],
			];
		}
		return [
			[
				'slug'  => 'header',
				'name'  => __( 'Header', 'meridian' ),
				'items' => $items,
			],
			[
				'slug'  => 'footer',
				'name'  => __( 'Footer', 'meridian' ),
				'items' => $items,
			],
			[
				'slug'  => 'secondary',
				'name'  => __( 'Secundario', 'meridian' ),
				'items' => [],
			],
		];
	}

	public static function header(): array {
		$h = get_option( MERIDIAN_OPTION_HEADER );
		if ( ! is_array( $h ) ) {
			$h = self::default_header();
			update_option( MERIDIAN_OPTION_HEADER, $h, false );
		}
		return wp_parse_args( $h, self::default_header() );
	}

	public static function footer(): array {
		$h = get_option( MERIDIAN_OPTION_FOOTER );
		if ( ! is_array( $h ) ) {
			$h = self::default_footer();
			update_option( MERIDIAN_OPTION_FOOTER, $h, false );
		}
		return wp_parse_args( $h, self::default_footer() );
	}

	public static function save_header( array $data ): array {
		$data = array_merge(
			self::default_header(),
			[
				'logoId'      => absint( $data['logoId'] ?? 0 ),
				'logoMobile'  => absint( $data['logoMobile'] ?? 0 ),
				'logoWidth'   => max( 40, absint( $data['logoWidth'] ?? 140 ) ),
				'sticky'      => ! empty( $data['sticky'] ),
				'ctaText'     => sanitize_text_field( $data['ctaText'] ?? '' ),
				'ctaUrl'      => \Meridian\Security\UrlValidator::sanitize( $data['ctaUrl'] ?? '' ),
				'menuSlug'    => sanitize_key( $data['menuSlug'] ?? 'header' ),
				'height'      => max( 48, absint( $data['height'] ?? 72 ) ),
				'paddingY'    => max( 0, absint( $data['paddingY'] ?? 12 ) ),
				'transparent' => ! empty( $data['transparent'] ),
				'align'       => in_array( $data['align'] ?? 'left', [ 'left', 'center' ], true ) ? $data['align'] : 'left',
				'background'  => sanitize_text_field( $data['background'] ?? 'var(--color-background)' ),
				'color'       => sanitize_text_field( $data['color'] ?? 'var(--color-text)' ),
			]
		);
		update_option( MERIDIAN_OPTION_HEADER, $data, false );
		\Meridian\Cache\DocumentCache::flush_chrome();
		return $data;
	}

	public static function save_footer( array $data ): array {
		$social = [];
		$raw    = $data['social'] ?? [];
		if ( is_string( $raw ) ) {
			foreach ( preg_split( '/\r\n|\r|\n/', $raw ) as $line ) {
				$line = trim( $line );
				if ( ! $line ) {
					continue;
				}
				$parts    = array_map( 'trim', explode( '|', $line, 2 ) );
				$social[] = [
					'label' => sanitize_text_field( $parts[0] ?? '' ),
					'url'   => \Meridian\Security\UrlValidator::sanitize( $parts[1] ?? '#' ),
				];
			}
		} elseif ( is_array( $raw ) ) {
			foreach ( $raw as $row ) {
				if ( ! is_array( $row ) ) {
					continue;
				}
				$social[] = [
					'label' => sanitize_text_field( $row['label'] ?? '' ),
					'url'   => \Meridian\Security\UrlValidator::sanitize( $row['url'] ?? '' ),
				];
			}
		}
		$data = array_merge(
			self::default_footer(),
			[
				'logoId'        => absint( $data['logoId'] ?? 0 ),
				'text'          => sanitize_textarea_field( $data['text'] ?? '' ),
				'copyright'     => sanitize_text_field( $data['copyright'] ?? '' ),
				'menuSlug'      => sanitize_key( $data['menuSlug'] ?? 'footer' ),
				'columns'       => max( 1, min( 4, absint( $data['columns'] ?? 3 ) ) ),
				'paddingY'      => max( 0, absint( $data['paddingY'] ?? 64 ) ),
				'background'    => sanitize_text_field( $data['background'] ?? 'var(--color-secondary)' ),
				'color'         => sanitize_text_field( $data['color'] ?? 'var(--color-on-secondary, #fff)' ),
				'extraTitle'    => sanitize_text_field( $data['extraTitle'] ?? '' ),
				'extraText'     => sanitize_textarea_field( $data['extraText'] ?? '' ),
				'showSearch'    => ! empty( $data['showSearch'] ),
				'social'        => $social,
			]
		);
		update_option( MERIDIAN_OPTION_FOOTER, $data, false );
		\Meridian\Cache\DocumentCache::flush_chrome();
		return $data;
	}

	public static function default_header(): array {
		return [
			'logoId'      => 0,
			'logoMobile'  => 0,
			'logoWidth'   => 140,
			'sticky'      => true,
			'ctaText'     => __( 'Contacto', 'meridian' ),
			'ctaUrl'      => '/contacto/',
			'menuSlug'    => 'header',
			'height'      => 72,
			'paddingY'    => 12,
			'transparent' => false,
			'align'       => 'left',
			'background'  => 'var(--color-background)',
			'color'       => 'var(--color-text)',
		];
	}

	public static function default_footer(): array {
		return [
			'logoId'     => 0,
			'text'       => __( 'Plataforma CMS y constructor visual.', 'meridian' ),
			'copyright'  => '© ' . gmdate( 'Y' ) . ' KRG CMS',
			'menuSlug'   => 'footer',
			'columns'    => 3,
			'paddingY'   => 64,
			'background' => 'var(--color-secondary)',
			'color'      => 'var(--color-on-secondary, #fff)',
			'extraTitle' => '',
			'extraText'  => '',
			'showSearch' => true,
			'social'     => [
				[ 'label' => 'Instagram', 'url' => 'https://instagram.com' ],
			],
		];
	}

	public static function social_lines( array $footer ): string {
		$out = [];
		foreach ( $footer['social'] ?? [] as $row ) {
			$out[] = ( $row['label'] ?? '' ) . '|' . ( $row['url'] ?? '' );
		}
		return implode( "\n", $out );
	}

	public static function identity(): array {
		$i = get_option( MERIDIAN_OPTION_IDENTITY, [] );
		if ( ! is_array( $i ) ) {
			$i = [];
		}
		return wp_parse_args(
			$i,
			[
				'siteName' => get_bloginfo( 'name' ),
				'tagline'  => get_bloginfo( 'description' ),
				'logoId'   => 0,
				'faviconId'=> 0,
			]
		);
	}

	public static function save_identity( array $data ): array {
		$out = [
			'siteName'  => sanitize_text_field( $data['siteName'] ?? '' ),
			'tagline'   => sanitize_text_field( $data['tagline'] ?? '' ),
			'logoId'    => absint( $data['logoId'] ?? 0 ),
			'faviconId' => absint( $data['faviconId'] ?? 0 ),
		];
		if ( $out['siteName'] ) {
			update_option( 'blogname', $out['siteName'] );
		}
		if ( $out['tagline'] !== '' ) {
			update_option( 'blogdescription', $out['tagline'] );
		}
		if ( $out['faviconId'] ) {
			update_option( 'site_icon', $out['faviconId'] );
		}
		update_option( MERIDIAN_OPTION_IDENTITY, $out, false );
		return $out;
	}
}
