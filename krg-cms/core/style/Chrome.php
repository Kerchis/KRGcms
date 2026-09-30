<?php
/**
 * Header/footer CSS from admin settings.
 *
 * @package Meridian
 */

namespace Meridian\Style;

defined( 'ABSPATH' ) || exit;

class Chrome {

	public static function css(): string {
		$h = \Meridian\Navigation\Menus::header();
		$f = \Meridian\Navigation\Menus::footer();
		$bg = self::color( $h['background'] ?? 'var(--color-background)' );
		$fg = self::color( $h['color'] ?? 'var(--color-text)' );
		$fbg = self::color( $f['background'] ?? 'var(--color-secondary)' );
		$ffg = self::color( $f['color'] ?? 'var(--color-on-secondary, #fff)' );
		$pad = max( 0, absint( $h['paddingY'] ?? 12 ) );
		$fpad = max( 0, absint( $f['paddingY'] ?? 64 ) );
		$cols = max( 1, min( 4, absint( $f['columns'] ?? 3 ) ) );
		$h_h = max( 48, absint( $h['height'] ?? 72 ) );
		$trans = ! empty( $h['transparent'] );
		$lines = [
			'.m-site-header{background:' . ( $trans ? 'transparent' : $bg ) . ';color:' . $fg . ';min-height:' . $h_h . 'px;}',
			'.m-site-header .m-header-inner{padding-block:' . $pad . 'px;}',
			'.m-site-header a,.m-site-header .m-logo-text,.m-nav-list a{color:' . $fg . ';}',
			'.m-site-footer{background:' . $fbg . ';color:' . $ffg . ';padding-top:' . $fpad . 'px;}',
			'.m-site-footer a,.m-site-footer .m-logo-text{color:' . $ffg . ';}',
			'.m-footer-grid{grid-template-columns:repeat(' . $cols . ',minmax(0,1fr));}',
		];
		if ( ( $h['align'] ?? 'left' ) === 'center' ) {
			$lines[] = '.m-header-inner{justify-content:center;flex-wrap:wrap;}';
		}
		$lines[] = '@media(max-width:' . ( Breakpoints::tablet() - 1 ) . 'px){.m-logo-desktop{display:none}.m-logo-mobile{display:block} .m-footer-grid{grid-template-columns:1fr;}}';
		$lines[] = '@media(min-width:' . Breakpoints::tablet() . 'px){.m-logo-mobile{display:none}}';
		return implode( '', $lines );
	}

	private static function color( string $v ): string {
		$v = trim( $v );
		if ( $v === '' ) {
			return 'transparent';
		}
		if ( str_starts_with( $v, 'var(' ) ) {
			return \Meridian\Design\TokenCompiler::safe_css( $v );
		}
		if ( str_starts_with( $v, 'color.' ) ) {
			return \Meridian\Design\TokenCompiler::token_var( $v );
		}
		$hex = sanitize_hex_color( $v );
		return $hex ?: 'var(--color-background)';
	}
}
